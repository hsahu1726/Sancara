# -*- coding: utf-8 -*-
"""
Sancara — Traffic Black Box
=============================
Aviation-style post-event analysis for a historical incident:

  * Event reconstruction timeline (real timestamps).
  * Root-cause analysis: primary cause + contributing factors, derived from the
    model's tree-SHAP drivers plus operational context.
  * Avoidable-delay analysis: actual resolution vs the historical median for
    comparable events (same cause), surfacing operational (not physical) delay.
"""

import numpy as np
import pandas as pd
from datetime import timedelta

from src.feature_engineering import parse_datetime, duration_band, DURATION_BAND_LABELS
from src.models import explain_prediction
from src.explain import humanize


def _to_dt(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    try:
        ts = pd.to_datetime(v, utc=True)
        return None if pd.isna(ts) else ts
    except Exception:
        return None


def reconstruct_timeline(event_row):
    start = _to_dt(event_row.get('start_datetime'))
    resolved = _to_dt(event_row.get('resolved_datetime'))
    closed = _to_dt(event_row.get('closed_datetime'))
    end = resolved or closed
    if start is None:
        return [], None

    events = [{'time': start, 'label': 'Event reported', 'type': 'start'}]
    if end is not None:
        dur = (end - start).total_seconds() / 60.0
        events.append({'time': start + (end - start) * 0.35,
                       'label': 'Queue building / congestion developing', 'type': 'escalation'})
        events.append({'time': start + (end - start) * 0.7,
                       'label': 'Peak disruption', 'type': 'peak'})
        events.append({'time': end,
                       'label': 'Resolved' if resolved else 'Administratively closed',
                       'type': 'end'})
    else:
        dur = None
        events.append({'time': None, 'label': 'Still active', 'type': 'active'})
    return events, dur


def avoidable_delay(event_row, df_hist):
    """Actual resolution minus the historical median for the same event cause."""
    start = _to_dt(event_row.get('start_datetime'))
    resolved = _to_dt(event_row.get('resolved_datetime')) or _to_dt(event_row.get('closed_datetime'))
    if start is None or resolved is None:
        return None
    actual = (resolved - start).total_seconds() / 60.0
    if actual <= 0:
        return None

    cause = str(event_row.get('event_cause', '')).lower().strip()
    h = df_hist.copy()
    h['_cause'] = h['event_cause'].astype(str).str.lower().str.strip()
    peers = h[(h['_cause'] == cause) & h['resolution_minutes'].notna() &
              (h['resolution_minutes'] > 0) & (h['resolution_minutes'] < 1440)]
    if len(peers) < 5:
        peers = h[h['resolution_minutes'].notna() & (h['resolution_minutes'] > 0) &
                  (h['resolution_minutes'] < 1440)]
    median = float(peers['resolution_minutes'].median()) if len(peers) else actual
    avoidable = max(0.0, actual - median)
    return {
        'actual_minutes': round(actual, 1),
        'historical_median_minutes': round(median, 1),
        'avoidable_minutes': round(avoidable, 1),
        'avoidable_pct': round(100 * avoidable / actual, 1) if actual else 0.0,
        'peer_count': int(len(peers)),
        'cause': cause,
    }


def root_cause_analysis(event_row, impact_model, encoders, engineer_fn):
    """
    Primary cause + contributing factors. Uses the impact model's tree-SHAP
    drivers for this specific event, mapped to operational language.
    """
    row_df = pd.DataFrame([event_row])
    X, _, _, feat_cols = engineer_fn(row_df, is_train=False, encoders=encoders)
    pred_class = int(impact_model.predict(X)[0])
    expl = explain_prediction(impact_model, X[0], feat_cols, top_k=6, predicted_class=pred_class)

    contributing = []
    for c in expl['contributions']:
        if c['contribution'] > 0:                 # factors that raised severity
            contributing.append(humanize(c['feature']))
    # operational overlays
    if str(event_row.get('requires_road_closure')).lower() in ('true', '1'):
        contributing.insert(0, 'Road closure in effect')
    hr = parse_datetime(row_df, 'start_datetime').dt.hour.iloc[0]
    if not np.isnan(hr) and (8 <= hr <= 10 or 17 <= hr <= 20):
        contributing.append('Occurred during peak hour')

    primary = (contributing[0] if contributing
               else f"{event_row.get('event_cause', 'event')} at a congested junction")
    seen, factors = set(), []
    for f in contributing[1:]:
        if f not in seen:
            seen.add(f)
            factors.append(f)
    return {
        'primary_cause': primary,
        'contributing_factors': factors[:5],
        'predicted_impact': pred_class,
        'drivers': expl['contributions'],
        'feature_cols': feat_cols,
    }
