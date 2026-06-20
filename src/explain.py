# -*- coding: utf-8 -*-
"""
Sancara — Explainability
==========================
Turns the exact tree-SHAP contributions (from models.explain_prediction, which
uses XGBoost's native `pred_contribs` — no `shap` dependency required) into
human-readable drivers and Plotly visuals for the dashboard.
"""

import plotly.graph_objects as go

FEATURE_LABELS = {
    'requires_road_closure': 'Road closure required',
    'priority_High': 'High priority',
    'priority_Low': 'Low priority',
    'is_peak_hour': 'Peak-hour timing',
    'is_night': 'Night-time',
    'is_weekend': 'Weekend',
    'hour': 'Hour of day',
    'month': 'Month',
    'event_type_planned': 'Planned event',
    'event_type_unplanned': 'Unplanned event',
    'cause_encoded': 'Event cause',
    'corridor_encoded': 'Corridor',
    'zone_encoded': 'Zone',
    'junction_encoded': 'Junction',
    'police_station_encoded': 'Police station',
    'cause_avg_resolution': 'Cause typical duration',
    'cause_event_count': 'Cause frequency',
    'corridor_avg_resolution': 'Corridor typical duration',
    'corridor_event_count': 'Corridor frequency',
    'zone_avg_resolution': 'Zone typical duration',
    'zone_event_count': 'Zone frequency',
    'junction_avg_resolution': 'Junction typical duration',
    'junction_event_count': 'Junction frequency',
    'junction_betweenness': 'Junction network centrality (fragility)',
    'junction_degree_net': 'Junction connectivity',
    'junction_eigenvector': 'Junction influence',
}


def humanize(feature):
    return FEATURE_LABELS.get(feature, feature.replace('_', ' ').title())


def drivers_text(explanation, top_k=5):
    """Bullet list: which factors pushed the prediction up vs down."""
    up, down = [], []
    for c in explanation['contributions'][:top_k]:
        label = humanize(c['feature'])
        if c['contribution'] >= 0:
            up.append((label, c['contribution']))
        else:
            down.append((label, c['contribution']))
    return up, down


def waterfall_figure(explanation, title='Why this prediction?'):
    contribs = explanation['contributions']
    labels = [humanize(c['feature']) for c in contribs][::-1]
    values = [c['contribution'] for c in contribs][::-1]
    colors = ['#E74C3C' if v >= 0 else '#2ECC71' for v in values]
    fig = go.Figure(go.Bar(
        x=values, y=labels, orientation='h',
        marker_color=colors,
        text=[f"{v:+.2f}" for v in values], textposition='outside',
    ))
    fig.update_layout(
        title=title, height=360, xaxis_title='Contribution to prediction (log-odds)',
        margin=dict(l=10, r=10, t=40, b=10),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
    )
    return fig


def importance_figure(importance_rows, title='Top model drivers (global)'):
    rows = importance_rows[::-1]
    fig = go.Figure(go.Bar(
        x=[r['gain'] for r in rows],
        y=[humanize(r['feature']) for r in rows],
        orientation='h', marker_color='#3498DB',
    ))
    fig.update_layout(title=title, height=420, xaxis_title='Gain importance',
                      margin=dict(l=10, r=10, t=40, b=10))
    return fig
