# -*- coding: utf-8 -*-
"""
Sancara — Traffic Digital Twin Simulator
==========================================
Runs multiple event scenarios through the live models (impact, AFT resolution,
calibrated cascade) plus the TTF estimate and junction fragility, for side-by-
side what-if comparison before deployment.
"""

import pandas as pd
from datetime import datetime

from src.feature_engineering import engineer_features, display_resolution
from src.models import predict_resolution, predict_cascade_proba
from src.resources import recommend_resources
from src.ttf import estimate_ttf

IMPACT_LABELS = {0: 'Low', 1: 'Medium', 2: 'High', 3: 'Critical'}


def run_scenario(params, impact_model, res_model, cascade_model, calibrator,
                 encoders, centrality_map=None):
    hour = int(params.get('hour', 12))
    row = pd.DataFrame([{
        'event_type': params['event_type'], 'event_cause': params['event_cause'],
        'priority': params['priority'], 'requires_road_closure': params['requires_road_closure'],
        'corridor': params['corridor'], 'zone': params['zone'],
        'junction': params['junction'] if params.get('junction', 'Unknown') != 'Unknown' else 'unknown',
        'start_datetime': (pd.Timestamp('2024-01-01') + pd.Timedelta(hours=hour)).strftime('%Y-%m-%d %H:%M:%S'),
        'resolved_datetime': None, 'closed_datetime': None,
        'police_station': 'unknown', 'status': 'active',
        'latitude': 12.97, 'longitude': 77.59,
    }])
    X, _, _, _ = engineer_features(row, is_train=False, encoders=encoders)

    impact = int(impact_model.predict(X)[0])
    impact_conf = float(impact_model.predict_proba(X)[0].max() * 100)
    resolution = display_resolution(predict_resolution(res_model, X)[0], params['event_cause'], encoders)
    cascade_p = float(predict_cascade_proba(cascade_model, calibrator, X)[0] * 100)

    junction = str(params.get('junction', 'unknown')).lower().replace(' ', '')
    fragility = float((centrality_map or {}).get(junction, {}).get('betweenness_norm', 0.0))
    peak = (8 <= hour <= 10) or (17 <= hour <= 20)
    ttf = estimate_ttf(cascade_p / 100, impact, resolution, fragility, peak)

    resources = recommend_resources(impact, params['event_cause'],
                                    params['requires_road_closure'], params['corridor'], hour)
    return {
        'name': params.get('name', 'Scenario'), 'event_cause': params['event_cause'],
        'priority': params['priority'], 'corridor': params['corridor'], 'zone': params['zone'],
        'junction': params.get('junction', 'Unknown'), 'hour': hour,
        'requires_road_closure': params['requires_road_closure'],
        'impact_level': impact, 'impact_label': IMPACT_LABELS[impact],
        'impact_confidence': impact_conf, 'resolution_minutes': resolution,
        'cascade_probability': cascade_p, 'ttf_min': ttf['time_to_failure_min'],
        'risk_level': ttf['risk_level'], 'fragility': round(fragility, 3),
        'officers': resources['officers'], 'barricades': resources['barricades'],
        'monitoring': resources['monitoring'], 'diversion': resources['diversion'],
    }


def compare_scenarios(scenarios, impact_model, res_model, cascade_model, calibrator,
                      encoders, centrality_map=None):
    return [run_scenario(s, impact_model, res_model, cascade_model, calibrator,
                         encoders, centrality_map) for s in scenarios]


def scenarios_to_dataframe(results):
    rows = []
    for r in results:
        rows.append({
            'Scenario': r['name'], 'Cause': r['event_cause'], 'Junction': r['junction'],
            'Corridor': r['corridor'], 'Hour': f"{r['hour']}:00",
            'Road Closure': 'Yes' if r['requires_road_closure'] else 'No',
            'Impact Level': r['impact_label'], 'Confidence': f"{r['impact_confidence']:.1f}%",
            'Resolution (min)': f"{r['resolution_minutes']:.0f}",
            'Cascade Prob.': f"{r['cascade_probability']:.1f}%",
            'TTF (min)': f"{r['ttf_min']:.0f}", 'Risk': r['risk_level'],
            'Officers': r['officers'], 'Barricades': r['barricades'],
            'Monitoring': r['monitoring'], 'Diversion': r['diversion'],
        })
    return pd.DataFrame(rows)
