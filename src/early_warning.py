# -*- coding: utf-8 -*-
"""
Sancara — Early Warning System
================================
Pre-event risk assessment so authorities can act BEFORE an event starts.

  * assess_event(): a 0–100 risk index for one upcoming event, blending impact
    severity, calibrated cascade probability, junction fragility and the TTF
    estimate — plus a recommended deployment lead time.
  * city_risk(): aggregate live risk across multiple active/upcoming events, with
    the multi-source percolation precursor (peak-cluster time) for the network.
"""

import numpy as np
import pandas as pd

from src.feature_engineering import display_resolution
from src.models import predict_resolution, predict_cascade_proba
from src.ttf import estimate_ttf
from src.network import multi_source_percolation


def _peak(hour):
    return bool((8 <= hour <= 10) or (17 <= hour <= 20))


def assess_event(params, impact_model, res_model, cascade_model, calibrator,
                 encoders, engineer_fn, centrality_map=None):
    """params: event_type, event_cause, priority, requires_road_closure, corridor,
    zone, junction, hour. Returns risk index, lead time and triggers."""
    hour = int(params.get('hour', 12))
    row = pd.DataFrame([{
        'event_type': params['event_type'], 'event_cause': params['event_cause'],
        'priority': params['priority'], 'requires_road_closure': params['requires_road_closure'],
        'corridor': params['corridor'], 'zone': params['zone'],
        'junction': params.get('junction', 'unknown') or 'unknown',
        'start_datetime': pd.Timestamp('2024-01-01') + pd.Timedelta(hours=hour),
        'resolved_datetime': None, 'closed_datetime': None,
        'police_station': 'unknown', 'status': 'active',
        'latitude': 12.97, 'longitude': 77.59,
    }])
    X, _, _, feat_cols = engineer_fn(row, is_train=False, encoders=encoders)

    impact = int(impact_model.predict(X)[0])
    impact_conf = float(impact_model.predict_proba(X)[0].max())
    resolution = display_resolution(predict_resolution(res_model, X)[0], params['event_cause'], encoders)
    cascade_p = float(predict_cascade_proba(cascade_model, calibrator, X)[0])

    junction = (params.get('junction') or 'unknown').lower().replace(' ', '')
    fragility = 0.0
    if centrality_map:
        fragility = float(centrality_map.get(junction, {}).get('betweenness_norm', 0.0))

    ttf = estimate_ttf(cascade_p, impact, resolution, fragility, _peak(hour))

    # 0-100 risk index
    risk = (0.35 * cascade_p + 0.30 * (impact / 3.0) +
            0.20 * fragility + 0.15 * ttf['escalation_pressure']) * 100
    if _peak(hour):
        risk = min(100.0, risk * 1.1)
    risk = float(np.clip(risk, 0, 100))

    # recommended deployment lead time (hours before start)
    if risk >= 66:
        lead, band, color = 3.0, 'Red — Critical', '#E74C3C'
    elif risk >= 40:
        lead, band, color = 2.0, 'Amber — Elevated', '#E67E22'
    elif risk >= 20:
        lead, band, color = 1.0, 'Yellow — Watch', '#F1C40F'
    else:
        lead, band, color = 0.0, 'Green — Routine', '#2ECC71'

    triggers = []
    if cascade_p >= 0.4:
        triggers.append(f"Cascade probability {cascade_p*100:.0f}% — pre-stage tow/clearance crews")
    if fragility >= 0.5:
        triggers.append("High-fragility junction — protect upstream corridors")
    if impact >= 2:
        triggers.append("High predicted impact — deploy officers + barricades in advance")
    if _peak(hour):
        triggers.append("Peak-hour onset — expect faster escalation")
    if not triggers:
        triggers.append("Routine monitoring sufficient")

    return {
        'risk_index': round(risk, 1), 'risk_band': band, 'risk_color': color,
        'lead_time_hours': lead, 'impact_level': impact, 'impact_confidence': impact_conf,
        'predicted_resolution_min': resolution, 'cascade_probability': cascade_p,
        'fragility': fragility, 'ttf': ttf, 'triggers': triggers,
        'recommendation': (f"Deploy resources ~{lead:.0f}h before start." if lead > 0
                           else "No advance deployment required."),
    }


def city_risk(active_df, graph, centrality_df):
    """Aggregate current network risk across active events + percolation precursor."""
    if active_df is None or len(active_df) == 0:
        return {'active_events': 0}
    sources = (active_df['junction'].astype(str).str.lower().str.replace(' ', '')
               .tolist())
    stats, precursor = multi_source_percolation(graph, sources, centrality_df)
    return {
        'active_events': int(len(active_df)),
        'percolation_curve': stats,
        'precursor_min': precursor,
        'source_junctions': [s for s in sources if s in graph],
    }
