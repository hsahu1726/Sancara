# -*- coding: utf-8 -*-
"""
Gridlock-Flipkart 2.0 — Sancara Training Pipeline (v2, leakage-safe)
=====================================================================
Steps:
  1. Load data
  2. Build road network + junction centrality (feeds features & fragility)
  3. Chronological train/test split on RAW data (no leakage)
  4. Fit feature pipeline on TRAIN only, transform TEST -> honest held-out metrics
  5. Refit every model on ALL data for production; save models + encoders + network
  6. Junction vulnerability (centrality-based fragility), similarity, hotspots
  7. Save rich metrics.json
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
import joblib
import warnings
warnings.filterwarnings('ignore')

from src.feature_engineering import engineer_features, parse_datetime, RELIABLE_CAP_MIN
from src.models import (
    train_impact_classifier, train_duration_band_classifier, train_cascade_classifier,
    train_aft_resolution, calibrate_binary, predict_cascade_proba,
    evaluate_classifier, evaluate_resolution, save_model,
)
from src.network import (build_road_graph, compute_centrality, centrality_feature_map,
                         save_network)
from src.vulnerability import compute_junction_vulnerability
from src.similarity import train_similarity_engine, save_similarity_engine
from src.hotspot_detection import detect_hotspots_by_cause, save_hotspot_models

BASE = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE, 'data', 'dataset.csv')
MODELS_DIR = os.path.join(BASE, 'models')
DATA_DIR = os.path.join(BASE, 'data')
os.makedirs(MODELS_DIR, exist_ok=True)


def main():
    print("=" * 64)
    print("  Sancara — Training Pipeline v2 (leakage-safe, survival-aware)")
    print("=" * 64)

    print("\n[1/7] Loading dataset...")
    df = pd.read_csv(DATA_PATH, low_memory=False).reset_index(drop=True)
    print(f"  {len(df)} rows, {len(df.columns)} columns")

    print("\n[2/7] Building road network + junction centrality...")
    G = build_road_graph(df)
    centrality = compute_centrality(G)
    cmap = centrality_feature_map(centrality)
    save_network(G, centrality)
    print(f"  graph: {G.number_of_nodes()} junctions, {G.number_of_edges()} edges")
    print("  most fragile (betweenness):",
          ", ".join(centrality['junction'].head(3).tolist()))

    print("\n[3/7] Chronological train/test split...")
    dates = parse_datetime(df, 'start_datetime')
    order = dates.argsort().to_numpy()
    split = int(len(order) * 0.8)
    tr_idx, te_idx = order[:split], order[split:]
    df_tr, df_te = df.iloc[tr_idx].copy(), df.iloc[te_idx].copy()
    print(f"  train {len(df_tr)} ({dates.iloc[tr_idx].min().date()} -> {dates.iloc[tr_idx].max().date()})")
    print(f"  test  {len(df_te)} ({dates.iloc[te_idx].min().date()} -> {dates.iloc[te_idx].max().date()})")

    print("\n[4/7] Honest held-out evaluation (fit on train, score on test)...")
    Xtr, ttr, enc_eval, cols = engineer_features(df_tr, is_train=True, centrality_map=cmap)
    Xte, tte, _, _ = engineer_features(df_te, is_train=False, encoders=enc_eval)

    metrics = {'feature_count': len(cols),
               'train_samples': int(len(df_tr)), 'test_samples': int(len(df_te))}

    # impact
    imp = train_impact_classifier(Xtr, ttr['impact_level'].to_numpy(),
                                  sample_weight=ttr['sample_weight'].to_numpy())
    m_imp = evaluate_classifier(imp, Xte, tte['impact_level'].to_numpy(), name='Impact Classifier')
    # honest sub-score on reliable test rows (genuinely-labelled outcomes)
    rel = tte['reliable'].to_numpy()
    if rel.sum() > 20:
        m_imp['accuracy_reliable_subset'] = float(
            (imp.predict(Xte[rel]) == tte['impact_level'].to_numpy()[rel]).mean())
        print(f"  impact accuracy on reliable subset (n={int(rel.sum())}): "
              f"{m_imp['accuracy_reliable_subset']:.3f}")
    metrics['impact'] = m_imp

    # prolonged-duration binary classifier (reliable rows only): P(resolution > 60 min).
    # NOTE: fine-grained duration is intrinsically weak here (corrupt/censored target,
    # low signal). We report in-distribution stratified-CV AUC as the honest measure of
    # discriminative power and flag the temporal-generalisation caveat.
    rtr = ttr['reliable'].to_numpy()
    band_model = train_cascade_classifier(Xtr[rtr], ttr['prolonged'].to_numpy()[rtr])
    proba_band = band_model.predict_proba(Xte[rel])[:, 1]
    m_band = evaluate_classifier(band_model, Xte[rel], tte['prolonged'].to_numpy()[rel],
                                 name='Prolonged-Duration Classifier (>60min)', proba=proba_band)
    try:
        from sklearn.model_selection import StratifiedKFold
        from sklearn.metrics import roc_auc_score
        from xgboost import XGBClassifier
        rel_all = ttr['reliable'].to_numpy()
        Xcv, ycv = Xtr[rel_all], ttr['prolonged'].to_numpy()[rel_all]
        cv_aucs = []
        for a, b in StratifiedKFold(5, shuffle=True, random_state=0).split(Xcv, ycv):
            mm = XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.05,
                               subsample=0.85, colsample_bytree=0.85, eval_metric='logloss',
                               random_state=42, n_jobs=-1).fit(Xcv[a], ycv[a])
            cv_aucs.append(roc_auc_score(ycv[b], mm.predict_proba(Xcv[b])[:, 1]))
        m_band['cv_auc_in_distribution'] = float(np.mean(cv_aucs))
        print(f"  prolonged in-distribution 5-fold AUC: {np.mean(cv_aucs):.3f}")
    except Exception as e:
        print(f"  (cv auc skipped: {e})")
    m_band['note'] = ('Duration is the hard/weak target: in-distribution AUC ~0.59, '
                      'near-random out-of-time. Lean on AFT median + cascade risk.')
    metrics['duration_prolonged'] = m_band

    # AFT resolution
    aft = train_aft_resolution(Xtr, ttr['y_lower'].to_numpy(), ttr['y_upper'].to_numpy())
    m_res = evaluate_resolution(aft, Xte, tte['resolution_minutes'].to_numpy(), rel)
    metrics['resolution'] = m_res

    # cascade + calibration (carve a calibration tail out of train)
    casc = train_cascade_classifier(Xtr, ttr['cascade'].to_numpy())
    cut = int(len(Xtr) * 0.85)
    iso, brier_raw, brier_cal = calibrate_binary(casc, Xtr[cut:], ttr['cascade'].to_numpy()[cut:])
    proba_te = predict_cascade_proba(casc, iso, Xte)
    m_casc = evaluate_classifier(casc, Xte, tte['cascade'].to_numpy(),
                                 name='Cascade Classifier', proba=proba_te)
    m_casc['brier_raw'] = brier_raw
    m_casc['brier_calibrated'] = brier_cal
    print(f"  Brier: raw {brier_raw:.4f} -> calibrated {brier_cal:.4f}")
    metrics['cascade'] = m_casc

    print("\n[5/7] Refitting all models on full data for production...")
    X, t, encoders, cols = engineer_features(df, is_train=True, centrality_map=cmap)
    encoders['cmap'] = cmap

    rel_full = t['reliable'].to_numpy()
    imp_f = train_impact_classifier(X, t['impact_level'].to_numpy(),
                                    sample_weight=t['sample_weight'].to_numpy())
    band_f = train_cascade_classifier(X[rel_full], t['prolonged'].to_numpy()[rel_full])
    aft_f = train_aft_resolution(X, t['y_lower'].to_numpy(), t['y_upper'].to_numpy())
    casc_f = train_cascade_classifier(X, t['cascade'].to_numpy())
    cut = int(len(X) * 0.85)
    iso_f, _, _ = calibrate_binary(casc_f, X[cut:], t['cascade'].to_numpy()[cut:])

    save_model(imp_f, 'impact_classifier')
    save_model(band_f, 'prolonged_classifier')
    save_model(aft_f, 'resolution_regressor')
    save_model(casc_f, 'cascade_classifier')
    joblib.dump(iso_f, os.path.join(MODELS_DIR, 'cascade_calibrator.pkl'))
    joblib.dump(encoders, os.path.join(MODELS_DIR, 'encoders.pkl'))
    print("  saved: impact, duration_band, resolution(AFT), cascade, calibrator, encoders")

    print("\n[6/7] Vulnerability (centrality fragility), similarity, hotspots...")
    df_feat = df.copy()
    df_feat['resolution_minutes'] = t['resolution_minutes']
    df_feat['impact_level'] = t['impact_level']
    df_feat['cascade'] = t['cascade']
    df_feat['priority_High'] = (df_feat['priority'].astype(str).str.lower().str.strip() == 'high').astype(int)
    df_feat['requires_road_closure'] = df_feat['requires_road_closure'].fillna(0).astype(int)
    vuln = compute_junction_vulnerability(df_feat, centrality_df=centrality)
    vuln.to_csv(os.path.join(DATA_DIR, 'junction_vulnerability.csv'), index=False)
    joblib.dump(df_feat, os.path.join(DATA_DIR, 'df_feat.pkl'))
    print(f"  vulnerability for {len(vuln)} junctions; top: {vuln.iloc[0]['junction']} "
          f"({vuln.iloc[0]['risk_score']}/10)")

    sim_df = df_feat.dropna(subset=['start_datetime'])
    vec, mat, edata = train_similarity_engine(sim_df)
    save_similarity_engine(vec, mat, edata)
    print(f"  similarity engine on {len(edata)} events")

    hotspots = detect_hotspots_by_cause(df_feat)
    save_hotspot_models(hotspots)
    print(f"  hotspots for {len(hotspots)} causes")

    print("\n[7/7] Saving metrics...")
    with open(os.path.join(MODELS_DIR, 'metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)

    print("\n" + "=" * 64)
    print("  Training complete. Held-out summary:")
    print(f"   Impact      acc {m_imp['accuracy']:.3f} (baseline {m_imp['majority_baseline']:.3f}), "
          f"macro-F1 {m_imp['macro_f1']:.3f}")
    print(f"   Prolonged   acc {m_band['accuracy']:.3f}, ROC-AUC {m_band.get('roc_auc', -1):.3f}, "
          f"PR-AUC {m_band.get('pr_auc', -1):.3f}")
    print(f"   Resolution  MedAE {m_res['medae']:.1f} min, MAE {m_res['mae']:.1f} (reliable n={m_res['n']})")
    print(f"   Cascade     ROC-AUC {m_casc.get('roc_auc', -1):.3f}, "
          f"PR-AUC {m_casc.get('pr_auc', -1):.3f}, Brier {brier_cal:.4f}")
    print("=" * 64)
    return metrics


if __name__ == '__main__':
    main()
