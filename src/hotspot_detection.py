# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import pickle
import os

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')


def detect_hotspots(df, eps=0.01, min_samples=5):
    coords = df[['latitude', 'longitude']].dropna().values
    if len(coords) < min_samples:
        return pd.DataFrame()

    scaler = StandardScaler()
    coords_scaled = scaler.fit_transform(coords)

    db = DBSCAN(eps=eps, min_samples=min_samples)
    labels = db.fit_predict(coords_scaled)

    result = pd.DataFrame({
        'latitude': coords[:, 0],
        'longitude': coords[:, 1],
        'cluster': labels
    })

    clusters = result[result['cluster'] >= 0]

    if len(clusters) == 0:
        return pd.DataFrame()

    hotspot_summary = clusters.groupby('cluster').agg(
        count=('latitude', 'size'),
        avg_lat=('latitude', 'mean'),
        avg_lon=('longitude', 'mean'),
        std_lat=('latitude', 'std'),
        std_lon=('longitude', 'std')
    ).reset_index()

    hotspot_summary['radius_km'] = np.sqrt(
        hotspot_summary['std_lat']**2 + hotspot_summary['std_lon']**2
    ) * 111

    hotspot_summary = hotspot_summary.sort_values('count', ascending=False)

    return hotspot_summary


def analyze_cause_hotspots(df):
    cause_hotspots = {}
    for cause in df['event_cause'].unique():
        subset = df[df['event_cause'] == cause]
        hotspots = detect_hotspots(subset)
        if len(hotspots) > 0:
            cause_hotspots[cause] = hotspots
    return cause_hotspots


def detect_hotspots_by_cause(df, eps=0.008, min_samples=4):
    results = {}
    for cause in df['event_cause'].dropna().unique():
        subset = df[df['event_cause'] == cause].dropna(subset=['latitude', 'longitude'])
        if len(subset) >= min_samples:
            hotspots = detect_hotspots(subset, eps=eps, min_samples=min_samples)
            if hotspots is not None and len(hotspots) > 0:
                results[cause] = hotspots
    return results


def save_hotspot_models(hotspot_data):
    path = os.path.join(MODELS_DIR, 'hotspots.pkl')
    with open(path, 'wb') as f:
        pickle.dump(hotspot_data, f)
    return path


def load_hotspot_models():
    path = os.path.join(MODELS_DIR, 'hotspots.pkl')
    if os.path.exists(path):
        with open(path, 'rb') as f:
            return pickle.load(f)
    return {}
