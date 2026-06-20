# -*- coding: utf-8 -*-
"""
Sancara — Models
==================
XGBoost models with correctness fixes:

  * Resolution time uses XGBoost AFT survival regression (`survival:aft`) so
    interval-censored admin-closes and right-censored active events are handled
    natively instead of being trusted or discarded.
  * A duration-band classifier (Quick/Moderate/Extended/Prolonged) gives a robust
    alternative to minute-level regression on heavy-tailed data.
  * Cascade probabilities are isotonic-calibrated on a held-out slice (Brier score
    reported before/after) so the displayed "escalation %" is trustworthy.
  * Early stopping on a validation split; class imbalance via scale_pos_weight /
    sample weights; honest metrics (macro-F1, balanced acc, PR-AUC, confusion).
  * Native tree-SHAP via `pred_contribs` — exact per-prediction explanations with
    no extra dependency.
"""

import os
import numpy as np
import joblib
import xgboost as xgb
from xgboost import XGBClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, f1_score,
                             classification_report, confusion_matrix, roc_auc_score,
                             average_precision_score, brier_score_loss,
                             mean_absolute_error, median_absolute_error)
import warnings
warnings.filterwarnings('ignore')

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
IMPACT_LABELS = {0: 'Low', 1: 'Medium', 2: 'High', 3: 'Critical'}


# ---------------------------------------------------------------------------
# classifiers
# ---------------------------------------------------------------------------
def _val_split(n, frac=0.15):
    """Chronological tail of the (already time-sorted) train block for early stop."""
    cut = int(n * (1 - frac))
    return np.arange(cut), np.arange(cut, n)


def train_impact_classifier(X, y, sample_weight=None):
    tr, va = _val_split(len(X))
    model = XGBClassifier(
        n_estimators=600, max_depth=6, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85, min_child_weight=3,
        gamma=0.1, reg_alpha=0.2, reg_lambda=1.5,
        objective='multi:softprob', num_class=4, eval_metric='mlogloss',
        early_stopping_rounds=40, random_state=42, n_jobs=-1,
    )
    sw = None if sample_weight is None else np.asarray(sample_weight)
    model.fit(X[tr], np.asarray(y)[tr],
              sample_weight=None if sw is None else sw[tr],
              eval_set=[(X[va], np.asarray(y)[va])], verbose=False)
    return model


def train_duration_band_classifier(X, y):
    tr, va = _val_split(len(X))
    n_class = int(np.max(y)) + 1
    model = XGBClassifier(
        n_estimators=500, max_depth=5, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85, min_child_weight=3,
        gamma=0.1, reg_alpha=0.2, reg_lambda=1.5,
        objective='multi:softprob', num_class=n_class, eval_metric='mlogloss',
        early_stopping_rounds=40, random_state=42, n_jobs=-1,
    )
    model.fit(X[tr], np.asarray(y)[tr],
              eval_set=[(X[va], np.asarray(y)[va])], verbose=False)
    return model


def train_cascade_classifier(X, y):
    y = np.asarray(y)
    tr, va = _val_split(len(X))
    pos = max(int(y[tr].sum()), 1)
    neg = len(y[tr]) - pos
    model = XGBClassifier(
        n_estimators=500, max_depth=5, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85, min_child_weight=2,
        gamma=0.1, reg_alpha=0.2, reg_lambda=1.5,
        objective='binary:logistic', eval_metric='aucpr',
        scale_pos_weight=neg / pos, early_stopping_rounds=40,
        random_state=42, n_jobs=-1,
    )
    model.fit(X[tr], y[tr], eval_set=[(X[va], y[va])], verbose=False)
    return model


def calibrate_binary(model, X_cal, y_cal):
    """Fit isotonic calibration on held-out data. Returns (iso, brier_raw, brier_cal)."""
    y_cal = np.asarray(y_cal)
    raw = model.predict_proba(X_cal)[:, 1]
    brier_raw = brier_score_loss(y_cal, raw)
    if len(np.unique(y_cal)) < 2:
        return None, brier_raw, brier_raw
    iso = IsotonicRegression(out_of_bounds='clip')
    iso.fit(raw, y_cal)
    brier_cal = brier_score_loss(y_cal, iso.transform(raw))
    return iso, float(brier_raw), float(brier_cal)


def predict_cascade_proba(model, iso, X):
    p = model.predict_proba(X)[:, 1]
    return iso.transform(p) if iso is not None else p


# ---------------------------------------------------------------------------
# AFT survival regression for resolution / time-to-resolution
# ---------------------------------------------------------------------------
def train_aft_resolution(X, y_lower, y_upper, num_boost_round=400, distribution='normal'):
    """
    XGBoost Accelerated Failure Time model. y_lower/y_upper are survival bounds:
    uncensored [d,d], interval [1,d], right-censored [elapsed, +inf]. Rows with
    NaN bounds are dropped. Returns a Booster predicting median resolution minutes.
    """
    y_lower = np.asarray(y_lower, dtype=float)
    y_upper = np.asarray(y_upper, dtype=float)
    mask = np.isfinite(y_lower) & ~np.isnan(y_lower)
    Xm, lo, up = X[mask], y_lower[mask], y_upper[mask]
    cut = int(len(Xm) * 0.85)

    def make(dm_X, dm_lo, dm_up):
        d = xgb.DMatrix(dm_X)
        d.set_float_info('label_lower_bound', dm_lo)
        d.set_float_info('label_upper_bound', dm_up)
        return d

    dtrain = make(Xm[:cut], lo[:cut], up[:cut])
    dval = make(Xm[cut:], lo[cut:], up[cut:])
    params = {
        'objective': 'survival:aft', 'eval_metric': 'aft-nloglik',
        'aft_loss_distribution': distribution, 'aft_loss_distribution_scale': 1.2,
        'tree_method': 'hist', 'learning_rate': 0.05, 'max_depth': 4,
        'subsample': 0.85, 'colsample_bytree': 0.85, 'lambda': 1.5, 'alpha': 0.2,
    }
    bst = xgb.train(params, dtrain, num_boost_round=num_boost_round,
                    evals=[(dval, 'val')], early_stopping_rounds=40, verbose_eval=False)
    return bst


def predict_resolution(model, X):
    """Predict resolution minutes. Works for an AFT Booster or a legacy regressor."""
    if isinstance(model, xgb.Booster):
        return model.predict(xgb.DMatrix(X))
    pred = model.predict(X)
    return np.expm1(pred) if pred.max() < 20 else pred  # legacy log-space safety


# ---------------------------------------------------------------------------
# evaluation (honest, imbalance-aware)
# ---------------------------------------------------------------------------
def evaluate_classifier(model, X_test, y_test, labels=None, name='Classifier', proba=None):
    y_test = np.asarray(y_test)
    y_pred = model.predict(X_test) if model is not None else (proba >= 0.5).astype(int)
    acc = accuracy_score(y_test, y_pred)
    bal = balanced_accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average='macro')
    cm = confusion_matrix(y_test, y_pred).tolist()
    out = {'name': name, 'accuracy': float(acc), 'balanced_accuracy': float(bal),
           'macro_f1': float(macro_f1), 'confusion_matrix': cm,
           'majority_baseline': float(np.bincount(y_test).max() / len(y_test))}
    if proba is not None and len(np.unique(y_test)) == 2:
        out['roc_auc'] = float(roc_auc_score(y_test, proba))
        out['pr_auc'] = float(average_precision_score(y_test, proba))
        out['positive_rate'] = float(y_test.mean())
    print(f"\n=== {name} ===")
    print(f"  accuracy {acc:.3f} | balanced {bal:.3f} | macro-F1 {macro_f1:.3f} "
          f"| baseline {out['majority_baseline']:.3f}")
    if 'roc_auc' in out:
        print(f"  ROC-AUC {out['roc_auc']:.3f} | PR-AUC {out['pr_auc']:.3f} "
              f"| pos-rate {out['positive_rate']:.3f}")
    return out


def evaluate_resolution(model, X_test, minutes_true, reliable_mask, name='AFT Resolution'):
    """MAE/MedAE on the reliable subset only (admin-closes excluded from scoring)."""
    pred = predict_resolution(model, X_test)
    true = np.asarray(minutes_true, dtype=float)
    m = np.asarray(reliable_mask) & np.isfinite(true) & np.isfinite(pred) & (true > 0)
    if m.sum() < 10:
        return {'name': name, 'mae': -1, 'medae': -1, 'n': int(m.sum())}
    mae = mean_absolute_error(true[m], pred[m])
    medae = median_absolute_error(true[m], pred[m])
    print(f"\n=== {name} (reliable n={int(m.sum())}) ===")
    print(f"  MAE {mae:.1f} min | MedAE {medae:.1f} min")
    return {'name': name, 'mae': float(mae), 'medae': float(medae), 'n': int(m.sum())}


# ---------------------------------------------------------------------------
# native tree-SHAP explanations (no shap dependency required)
# ---------------------------------------------------------------------------
def explain_prediction(model, X_row, feature_names, top_k=8, predicted_class=None):
    """
    Exact SHAP contributions for one row via XGBoost `pred_contribs`. For
    multiclass, explains `predicted_class` (defaults to argmax). Returns a list
    of {feature, contribution} sorted by |contribution|, plus the base value.
    """
    booster = model.get_booster() if hasattr(model, 'get_booster') else model
    X_row = np.asarray(X_row).reshape(1, -1)
    contribs = booster.predict(xgb.DMatrix(X_row), pred_contribs=True)
    contribs = np.asarray(contribs)
    if contribs.ndim == 3:  # (1, n_class, n_feat+1)
        if predicted_class is None:
            predicted_class = int(np.argmax(model.predict_proba(X_row)[0]))
        row = contribs[0, predicted_class]
    else:                   # (1, n_feat+1)
        row = contribs[0]
    base = float(row[-1])
    feats = row[:-1]
    order = np.argsort(np.abs(feats))[::-1][:top_k]
    items = [{'feature': feature_names[i], 'contribution': float(feats[i])} for i in order]
    return {'base_value': base, 'contributions': items, 'predicted_class': predicted_class}


def feature_importance(model, feature_names, top_k=15):
    booster = model.get_booster() if hasattr(model, 'get_booster') else model
    score = booster.get_score(importance_type='gain')
    # xgboost names features f0,f1,... -> map back
    rows = []
    for k, v in score.items():
        idx = int(k[1:]) if k.startswith('f') else None
        name = feature_names[idx] if idx is not None and idx < len(feature_names) else k
        rows.append({'feature': name, 'gain': float(v)})
    rows.sort(key=lambda r: r['gain'], reverse=True)
    return rows[:top_k]


# ---------------------------------------------------------------------------
# persistence
# ---------------------------------------------------------------------------
def save_model(model, name):
    path = os.path.join(MODELS_DIR, f'{name}.pkl')
    if isinstance(model, xgb.Booster):
        model.save_model(os.path.join(MODELS_DIR, f'{name}.ubj'))
        joblib.dump({'__booster__': f'{name}.ubj'}, path)
    else:
        joblib.dump(model, path)
    return path


def load_model(name):
    path = os.path.join(MODELS_DIR, f'{name}.pkl')
    if not os.path.exists(path):
        return None
    obj = joblib.load(path)
    if isinstance(obj, dict) and '__booster__' in obj:
        bst = xgb.Booster()
        bst.load_model(os.path.join(MODELS_DIR, obj['__booster__']))
        return bst
    return obj
