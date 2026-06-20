# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np


IMPACT_RESOURCE_MAP = {
    0: {'impact': 'Low', 'officers': 2, 'barricades': 2,
        'monitoring': 'Observation Only', 'diversion': 'Not Required',
        'description': 'Minimal disruption. Regular monitoring sufficient.'},
    1: {'impact': 'Medium', 'officers': 5, 'barricades': 6,
        'monitoring': 'Normal', 'diversion': 'Standby',
        'description': 'Moderate disruption expected. Prepare diversion routes.'},
    2: {'impact': 'High', 'officers': 10, 'barricades': 14,
        'monitoring': 'Immediate', 'diversion': 'Required',
        'description': 'Significant disruption. Activate diversion and deploy resources.'},
    3: {'impact': 'Critical', 'officers': 15, 'barricades': 20,
        'monitoring': 'Immediate', 'diversion': 'Required',
        'description': 'City-wide impact likely. Full response team needed.'}
}


EVENT_CAUSE_RESOURCE_MODIFIERS = {
    'public_event': {'officers_mult': 1.3, 'barricades_mult': 1.4},
    'procession': {'officers_mult': 1.4, 'barricades_mult': 1.5},
    'vip_movement': {'officers_mult': 1.5, 'barricades_mult': 1.3},
    'construction': {'officers_mult': 0.8, 'barricades_mult': 1.8},
    'water_logging': {'officers_mult': 1.2, 'barricades_mult': 0.5},
    'tree_fall': {'officers_mult': 1.3, 'barricades_mult': 1.5},
    'accident': {'officers_mult': 1.4, 'barricades_mult': 1.3},
    'vehicle_breakdown': {'officers_mult': 1.0, 'barricades_mult': 0.6},
}


def recommend_resources(impact_level, event_cause=None, requires_road_closure=False,
                        corridor=None, hour=None):
    base = IMPACT_RESOURCE_MAP.get(impact_level, IMPACT_RESOURCE_MAP[1])
    officers = base['officers']
    barricades = base['barricades']
    monitoring = base['monitoring']
    diversion = base['diversion']

    if event_cause and event_cause.lower().strip() in EVENT_CAUSE_RESOURCE_MODIFIERS:
        mod = EVENT_CAUSE_RESOURCE_MODIFIERS[event_cause.lower().strip()]
        officers = int(round(officers * mod['officers_mult']))
        barricades = int(round(barricades * mod['barricades_mult']))

    if requires_road_closure:
        barricades = max(barricades, int(barricades * 1.5))
        diversion = 'Required'

    if hour is not None and (8 <= hour <= 10 or 17 <= hour <= 20):
        officers = int(round(officers * 1.2))
        barricades = int(round(barricades * 1.15))

    if corridor and corridor.lower().strip() not in ['non-corridor', 'unknown', '']:
        officers = int(round(officers * 1.1))
        barricades = int(round(barricades * 1.1))

    return {
        'officers': max(officers, 1),
        'barricades': max(barricades, 1),
        'monitoring': monitoring,
        'diversion': diversion,
        'impact': base['impact'],
        'description': base['description']
    }


RESOURCE_HISTORY = []


def log_recommendation(event_id, features, recommendation):
    RESOURCE_HISTORY.append({
        'event_id': event_id,
        'features': features,
        'recommendation': recommendation
    })


def get_learning_summary():
    if not RESOURCE_HISTORY:
        return None
    df = pd.DataFrame(RESOURCE_HISTORY)
    summary = df.groupby('impact').agg(
        avg_officers=('officers', 'mean'),
        avg_barricades=('barricades', 'mean'),
        count=('officers', 'count')
    ).reset_index()
    return summary
