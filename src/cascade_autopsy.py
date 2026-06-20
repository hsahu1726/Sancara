# -*- coding: utf-8 -*-
"""
Sancara — Cascade Autopsy (counterfactual intelligence)
=========================================================
For a selected historical event:

  * Predict impact, calibrated cascade probability and the Time-To-Failure /
    decision window (the "Point of No Return").
  * Counterfactual levers (PDF Enhancement #5): what if the road closure were
    lifted? what if the event were shifted off peak-hour? Re-score impact and
    cascade to quantify the preventable share.
  * Network spread: propagate stress from the event's junction and find the
    percolation network-critical time.
"""

import numpy as np
import pandas as pd
from datetime import timedelta

from src.feature_engineering import parse_datetime, display_resolution
from src.models import predict_resolution, predict_cascade_proba
from src.ttf import estimate_ttf
from src.network import simulate_propagation, percolation_early_warning


def _peak(hour):
    return bool((8 <= hour <= 10) or (17 <= hour <= 20))


def _score(row_df, impact_model, res_model, cascade_model, calibrator, encoders, engineer_fn,
           centrality_map):
    X, _, _, _ = engineer_fn(row_df, is_train=False, encoders=encoders)
    impact = int(impact_model.predict(X)[0])
    resolution = display_resolution(predict_resolution(res_model, X)[0],
                                    row_df['event_cause'].iloc[0], encoders)
    cascade_p = float(predict_cascade_proba(cascade_model, calibrator, X)[0])
    hour = int(parse_datetime(row_df, 'start_datetime').dt.hour.iloc[0])
    junction = str(row_df['junction'].iloc[0]).lower().replace(' ', '')
    fragility = float((centrality_map or {}).get(junction, {}).get('betweenness_norm', 0.0))
    ttf = estimate_ttf(cascade_p, impact, resolution, fragility, _peak(hour))
    return {'impact': impact, 'resolution': resolution, 'cascade_p': cascade_p,
            'fragility': fragility, 'ttf': ttf, 'hour': hour}


def run_autopsy(event_row, impact_model, res_model, cascade_model, calibrator,
                encoders, engineer_fn, centrality_map=None, graph=None):
    base_df = pd.DataFrame([event_row])
    base = _score(base_df, impact_model, res_model, cascade_model, calibrator,
                  encoders, engineer_fn, centrality_map)

    start = parse_datetime(base_df, 'start_datetime').iloc[0]
    ttf = base['ttf']
    ponr_min = ttf['decision_window_min']
    ponr_time = (start + timedelta(minutes=ponr_min)).strftime('%H:%M') if pd.notna(start) else '--:--'

    # ---- counterfactuals -------------------------------------------------
    counterfactuals = []
    # (a) lift the road closure
    if str(event_row.get('requires_road_closure')).lower() in ('true', '1', 'yes'):
        cf = dict(event_row); cf['requires_road_closure'] = False
        s = _score(pd.DataFrame([cf]), impact_model, res_model, cascade_model, calibrator,
                   encoders, engineer_fn, centrality_map)
        counterfactuals.append({'lever': 'Lift road closure', **s})
    # (b) shift off peak hour
    if _peak(base['hour']) and pd.notna(start):
        cf = dict(event_row)
        cf['start_datetime'] = (start.replace(hour=13, minute=0)).isoformat()
        s = _score(pd.DataFrame([cf]), impact_model, res_model, cascade_model, calibrator,
                   encoders, engineer_fn, centrality_map)
        counterfactuals.append({'lever': 'Shift to off-peak (13:00)', **s})

    best = min(counterfactuals, key=lambda c: c['cascade_p'], default=None)
    cascade_reduction = (base['cascade_p'] - best['cascade_p']) if best else 0.0

    # ---- network spread --------------------------------------------------
    propagation, precursor = pd.DataFrame(), None
    junction = str(event_row.get('junction', 'unknown')).lower().replace(' ', '')
    if graph is not None and junction in graph and centrality_map is not None:
        cen_df = pd.DataFrame([{'junction': j, **v} for j, v in centrality_map.items()])
        propagation = simulate_propagation(graph, junction, cen_df)
        _, precursor = percolation_early_warning(graph, propagation)

    return {
        'base': base,
        'point_of_no_return_time': ponr_time,
        'decision_window_min': ponr_min,
        'time_to_failure_min': ttf['time_to_failure_min'],
        'counterfactuals': counterfactuals,
        'best_counterfactual': best,
        'cascade_reduction': round(float(cascade_reduction), 3),
        'preventable': bool(cascade_reduction > 0.05),
        'propagation': propagation,
        'network_critical_min': precursor,
        'event_start': start.strftime('%H:%M') if pd.notna(start) else '--:--',
    }
