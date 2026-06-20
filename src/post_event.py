# -*- coding: utf-8 -*-
"""
Sancara — Post-Event Learning System
======================================
Closes the loop the brief asks for ("No post-event learning system"). Every
prediction is persisted to disk; as ground truth arrives it is matched back and
we measure how well the system actually performed — accuracy, resolution error,
probability calibration and drift over time.

`seed_from_history()` backfills the log by replaying historical events through
the live models and comparing to their real outcomes, so the learning view is
evidence-backed from the first launch.
"""

import os
import numpy as np
import pandas as pd

from src.models import predict_resolution, predict_cascade_proba

LOG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'predictions_log.csv')
COLUMNS = ['logged_at', 'event_id', 'event_cause', 'junction', 'corridor',
           'predicted_impact', 'predicted_resolution', 'predicted_cascade_prob',
           'actual_impact', 'actual_resolution', 'actual_cascade', 'source']


def _empty():
    return pd.DataFrame(columns=COLUMNS)


def load_log():
    if os.path.exists(LOG_PATH):
        try:
            return pd.read_csv(LOG_PATH)
        except Exception:
            return _empty()
    return _empty()


def log_prediction(record, now=None):
    df = load_log()
    record = {**record}
    record.setdefault('logged_at', str(now) if now is not None else 'live')
    record.setdefault('source', 'live')
    for c in COLUMNS:
        record.setdefault(c, np.nan)
    df = pd.concat([df, pd.DataFrame([record])[COLUMNS]], ignore_index=True)
    df.to_csv(LOG_PATH, index=False)
    return len(df)


def seed_from_history(df, X, targets, impact_model, res_model, cascade_model,
                      calibrator, n=400, seed=42):
    """Replay n reliable historical events through the models; store pred vs actual."""
    rel = targets['reliable'].to_numpy()
    idx = np.where(rel)[0]
    rng = np.random.default_rng(seed)
    if len(idx) > n:
        idx = rng.choice(idx, size=n, replace=False)
    idx = np.sort(idx)

    pred_impact = impact_model.predict(X[idx])
    pred_res = predict_resolution(res_model, X[idx])
    pred_casc = predict_cascade_proba(cascade_model, calibrator, X[idx])

    sub = df.iloc[idx]
    rows = []
    for k, (_, r) in enumerate(sub.iterrows()):
        gi = idx[k]
        rows.append({
            'logged_at': str(pd.to_datetime(r.get('start_datetime'), utc=True, errors='coerce')),
            'event_id': r.get('id', gi),
            'event_cause': str(r.get('event_cause', 'unknown')).lower(),
            'junction': str(r.get('junction', 'unknown')).lower(),
            'corridor': str(r.get('corridor', 'unknown')).lower(),
            'predicted_impact': int(pred_impact[k]),
            'predicted_resolution': float(pred_res[k]),
            'predicted_cascade_prob': float(pred_casc[k]),
            'actual_impact': int(targets['impact_level'].to_numpy()[gi]),
            'actual_resolution': float(targets['resolution_minutes'].to_numpy()[gi]),
            'actual_cascade': int(targets['cascade'].to_numpy()[gi]),
            'source': 'history_replay',
        })
    out = pd.DataFrame(rows)[COLUMNS]
    out.to_csv(LOG_PATH, index=False)
    return len(out)


def learning_summary(log=None):
    log = load_log() if log is None else log
    if log.empty:
        return None
    done = log.dropna(subset=['actual_impact'])
    summary = {'total_predictions': int(len(log)), 'with_ground_truth': int(len(done))}
    if done.empty:
        return summary

    pi = done['predicted_impact'].astype(float)
    ai = done['actual_impact'].astype(float)
    summary['impact_accuracy'] = float((pi == ai).mean())
    summary['impact_within_1'] = float((pi - ai).abs().le(1).mean())

    res = done.dropna(subset=['actual_resolution', 'predicted_resolution'])
    res = res[(res['actual_resolution'] > 0) & (res['actual_resolution'] < 1440)]
    if len(res):
        err = (res['predicted_resolution'] - res['actual_resolution']).abs()
        summary['resolution_mae'] = float(err.mean())
        summary['resolution_medae'] = float(err.median())

    casc = done.dropna(subset=['actual_cascade', 'predicted_cascade_prob'])
    if len(casc):
        # reliability curve (calibration): predicted-prob bins vs observed rate
        bins = np.linspace(0, 1, 6)
        casc = casc.assign(_bin=pd.cut(casc['predicted_cascade_prob'], bins, include_lowest=True))
        rel = casc.groupby('_bin', observed=True).agg(
            predicted=('predicted_cascade_prob', 'mean'),
            observed=('actual_cascade', 'mean'),
            n=('actual_cascade', 'size')).reset_index(drop=True)
        summary['calibration'] = rel
        summary['cascade_brier'] = float(
            ((casc['predicted_cascade_prob'] - casc['actual_cascade']) ** 2).mean())
    return summary


def accuracy_over_time(log=None, freq='W'):
    log = load_log() if log is None else log
    done = log.dropna(subset=['actual_impact'])
    if done.empty:
        return pd.DataFrame()
    done = done.copy()
    done['ts'] = pd.to_datetime(done['logged_at'], utc=True, errors='coerce')
    done = done.dropna(subset=['ts'])
    done['correct'] = (done['predicted_impact'].astype(float) == done['actual_impact'].astype(float))
    g = done.set_index('ts').groupby(pd.Grouper(freq=freq))['correct'].agg(['mean', 'size'])
    return g.reset_index().rename(columns={'mean': 'accuracy', 'size': 'n'})
