# -*- coding: utf-8 -*-
import os
import json
import pickle
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from src.feature_engineering import engineer_features
from src.models import load_model, predict_resolution, predict_cascade_proba
from src.vulnerability import compute_junction_vulnerability
from src.hotspot_detection import load_hotspot_models
from src.similarity import load_similarity_engine, find_similar_events
from src.resources import recommend_resources, IMPACT_RESOURCE_MAP
from src.cascade_autopsy import run_autopsy
from src.network import load_network

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, 'models')
DATA_DIR = os.path.join(BASE_DIR, 'data')

app = FastAPI(title="Sancara API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

_cache = {}


def _load_all():
    if _cache:
        return _cache
    _cache['df'] = pd.read_csv(os.path.join(DATA_DIR, 'dataset.csv'), low_memory=False)
    _cache['impact'] = load_model('impact_classifier')
    _cache['prolonged'] = load_model('prolonged_classifier')
    _cache['resolution'] = load_model('resolution_regressor')
    _cache['cascade'] = load_model('cascade_classifier')
    cal_path = os.path.join(MODELS_DIR, 'cascade_calibrator.pkl')
    _cache['calibrator'] = joblib.load(cal_path) if os.path.exists(cal_path) else None
    enc_path = os.path.join(MODELS_DIR, 'encoders.pkl')
    _cache['encoders'] = joblib.load(enc_path) if os.path.exists(enc_path) else {}
    _cache['graph'], _cache['centrality'] = load_network()
    _cache['sim_vec'], _cache['sim_mat'], _cache['sim_data'] = load_similarity_engine()
    _cache['hotspots'] = load_hotspot_models()
    return _cache


def _safe_val(v, default=0):
    """Convert a value to JSON-safe number, replacing NaN/Inf with default."""
    if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
        return default
    return v


def _clean_json(obj):
    """Recursively replace NaN/Inf in any object with 0."""
    if isinstance(obj, dict):
        return {k: _clean_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean_json(v) for v in obj]
    elif isinstance(obj, float):
        return _safe_val(obj, 0)
    return obj


def _get_impact_label(level: int) -> str:
    return {0: 'Low', 1: 'Medium', 2: 'High', 3: 'Critical'}.get(level, 'Unknown')


def _get_impact_color(level: int) -> str:
    return {0: '#22c55e', 1: '#eab308', 2: '#f97316', 3: '#ef4444'}.get(level, '#6b7280')


# ── Pydantic models ──────────────────────────────────────────────────────────

class PredictionInput(BaseModel):
    event_type: str = "unplanned"
    event_cause: str = "vehicle_breakdown"
    priority: str = "Low"
    requires_road_closure: bool = False
    corridor: str = "Non-corridor"
    zone: str = "Central Zone 2"
    junction: str = "unknown"
    hour: int = 14
    latitude: float = 12.97
    longitude: float = 77.59


class SimilarityInput(BaseModel):
    event_cause: str = "vehicle_breakdown"
    corridor: str = "Non-corridor"
    zone: str = "Central Zone 2"
    junction: str = "unknown"
    event_type: str = "unplanned"
    priority: str = "Low"


class AutopsyInput(BaseModel):
    event_id: str


class ResourceInput(BaseModel):
    event_cause: str = "vehicle_breakdown"
    priority: str = "Low"
    corridor: str = "Non-corridor"
    hour: int = 14
    requires_road_closure: bool = False


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/dashboard/stats")
def dashboard_stats():
    c = _load_all()
    df = c['df']

    X, targets, _, _ = engineer_features(df, is_train=True)
    df_feat = df.copy()
    df_feat['resolution_minutes'] = targets['resolution_minutes']
    df_feat['impact_level'] = targets['impact_level']

    total = len(df)
    active = int((df['status'] == 'active').sum())
    high_impact = int((df_feat['impact_level'] >= 2).sum())

    vuln_path = os.path.join(DATA_DIR, 'junction_vulnerability.csv')
    if os.path.exists(vuln_path):
        vuln = pd.read_csv(vuln_path)
        top_junction = vuln.iloc[0]['junction'] if len(vuln) > 0 else "N/A"
    else:
        top_junction = "N/A"

    dates = pd.to_datetime(df['start_datetime'], utc=True, errors='coerce')
    daily = dates.dt.date.value_counts().sort_index()

    metrics_path = os.path.join(MODELS_DIR, 'metrics.json')
    metrics = {}
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            metrics = json.load(f)

    return {
        "total_events": total, "active_events": active,
        "high_impact_events": high_impact, "top_junction": top_junction,
        "junctions_count": int(df['junction'].nunique()),
        "zones_count": int(df['zone'].nunique()),
        "event_type_distribution": df['event_type'].value_counts().to_dict(),
        "impact_distribution": {str(k): int(v) for k, v in targets['impact_level'].value_counts().sort_index().to_dict().items()},
        "cause_distribution": df['event_cause'].value_counts().head(8).to_dict(),
        "corridor_distribution": df['corridor'].value_counts().head(10).to_dict(),
        "time_series": {str(k): int(v) for k, v in daily.head(60).items()},
        "metrics": metrics,
    }


@app.get("/api/dashboard/vulnerability")
def get_vulnerability(top_n: int = 20, min_events: int = 5):
    c = _load_all()
    df = c['df']
    X, targets, _, _ = engineer_features(df, is_train=True)
    df_feat = df.copy()
    df_feat['resolution_minutes'] = targets['resolution_minutes']
    df_feat['impact_level'] = targets['impact_level']
    df_feat['priority_High'] = (df_feat['priority'].astype(str).str.lower().str.strip() == 'high').astype(int)
    df_feat['requires_road_closure'] = df_feat['requires_road_closure'].fillna(0).astype(int)
    centrality_df = c.get('centrality')
    vuln = compute_junction_vulnerability(df_feat, centrality_df=centrality_df)
    filtered = vuln[vuln['event_count'] >= min_events].head(top_n)
    cols = ['junction', 'risk_score', 'risk_category', 'event_count',
            'avg_resolution_minutes', 'high_priority_ratio', 'closure_ratio']
    available = [c for c in cols if c in filtered.columns]
    result = filtered[available].copy()
    for col in result.select_dtypes(include=['float64', 'float32']).columns:
        result[col] = result[col].fillna(0).replace([np.inf, -np.inf], 0)
    return result.to_dict(orient='records')


@app.post("/api/predict")
def predict(input_data: PredictionInput):
    c = _load_all()
    encoders = c['encoders']

    input_df = pd.DataFrame([{
        'event_type': input_data.event_type, 'event_cause': input_data.event_cause,
        'priority': input_data.priority,
        'requires_road_closure': input_data.requires_road_closure,
        'corridor': input_data.corridor, 'zone': input_data.zone,
        'junction': input_data.junction,
        'start_datetime': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'resolved_datetime': pd.NaT, 'closed_datetime': pd.NaT,
        'police_station': 'unknown', 'status': 'active',
        'latitude': input_data.latitude, 'longitude': input_data.longitude,
    }])

    cmap = encoders.get('cmap')
    try:
        X_input, _, _, _ = engineer_features(input_df, is_train=False, encoders=encoders, centrality_map=cmap)
    except Exception as e:
        raise HTTPException(400, f"Feature engineering error: {str(e)}")

    impact_pred = int(c['impact'].predict(X_input)[0])
    impact_proba = c['impact'].predict_proba(X_input)[0].tolist()
    res_pred = _safe_val(float(predict_resolution(c['resolution'], X_input)[0]), 0)
    cascade_proba = float(predict_cascade_proba(c['cascade'], c['calibrator'], X_input)[0])
    cascade_pred = 1 if cascade_proba > 0.5 else 0
    resources = recommend_resources(impact_pred, input_data.event_cause,
                                    input_data.requires_road_closure, input_data.corridor, input_data.hour)

    return _clean_json({
        "impact_level": impact_pred, "impact_label": _get_impact_label(impact_pred),
        "impact_color": _get_impact_color(impact_pred),
        "impact_probabilities": impact_proba,
        "confidence": round(max(impact_proba) * 100, 1),
        "resolution_minutes": round(res_pred, 0),
        "cascade_prediction": cascade_pred,
        "cascade_probability": round(cascade_proba * 100, 1),
        "cascade_label": "High" if cascade_pred == 1 else "Low",
        "resources": resources,
    })


@app.post("/api/similarity")
def similarity_search(input_data: SimilarityInput):
    c = _load_all()
    vec, mat, ev_data = c['sim_vec'], c['sim_mat'], c['sim_data']
    if vec is None or mat is None or ev_data is None:
        raise HTTPException(503, "Similarity engine not available")

    query = {
        'event_cause': input_data.event_cause, 'corridor': input_data.corridor,
        'zone': input_data.zone, 'junction': input_data.junction,
        'event_type': input_data.event_type, 'priority': input_data.priority,
        'police_station': 'unknown',
    }
    results = find_similar_events(query, vec, mat, ev_data, top_k=5)

    return _clean_json({"results": [
        {"event_id": r.get('id', ''), "event_cause": r.get('event_cause', ''),
         "corridor": r.get('corridor', ''), "zone": r.get('zone', ''),
         "junction": r.get('junction', ''), "priority": r.get('priority', ''),
         "impact_level": int(r.get('impact_level', 1)),
         "impact_label": _get_impact_label(int(r.get('impact_level', 1))),
         "resolution_minutes": round(r.get('resolution_minutes', 0), 1),
         "similarity_score": r.get('similarity_score', 0)}
        for r in results
    ]})


@app.get("/api/hotspots")
def get_hotspots(cause: Optional[str] = None):
    c = _load_all()
    hotspots = c['hotspots']
    if cause:
        if cause not in hotspots:
            raise HTTPException(404, f"No hotspots for cause: {cause}")
        return {"cause": cause, "hotspots": hotspots[cause].to_dict(orient='records')}
    return {"causes": {k: len(v) for k, v in hotspots.items()}}


@app.get("/api/events")
def get_events(limit: int = 100):
    c = _load_all()
    df = c['df']
    X, targets, _, _ = engineer_features(df, is_train=True)
    df_feat = df.copy()
    df_feat['resolution_minutes'] = targets['resolution_minutes']
    df_feat['impact_level'] = targets['impact_level']

    subset = df_feat.head(limit)
    events = []
    for _, row in subset.iterrows():
        res_mins = row.get('resolution_minutes', 0)
        if pd.isna(res_mins) or np.isinf(res_mins) if isinstance(res_mins, float) else False:
            res_mins = 0
        imp_lvl = row.get('impact_level', 1)
        if pd.isna(imp_lvl) or np.isinf(imp_lvl) if isinstance(imp_lvl, float) else False:
            imp_lvl = 1
        events.append({
            "id": str(row.get('id', '')),
            "event_cause": str(row.get('event_cause', '')),
            "corridor": str(row.get('corridor', '')),
            "junction": str(row.get('junction', '')),
            "resolution_minutes": round(float(res_mins), 1),
            "priority": str(row.get('priority', '')),
            "impact_level": int(imp_lvl),
            "impact_label": _get_impact_label(int(imp_lvl)),
        })
    return {"events": events}


@app.post("/api/autopsy")
def run_autopsy_endpoint(input_data: AutopsyInput):
    c = _load_all()
    df = c['df']

    X, targets, _, _ = engineer_features(df, is_train=True)
    df_feat = df.copy()
    df_feat['resolution_minutes'] = targets['resolution_minutes']
    df_feat['impact_level'] = targets['impact_level']

    event_row = df_feat[df_feat['id'] == input_data.event_id]
    if len(event_row) == 0:
        raise HTTPException(404, "Event not found")
    event_row = event_row.iloc[0].to_dict()

    result = run_autopsy(
        event_row, c['impact'], c['resolution'], c['cascade'],
        c['calibrator'], c['encoders'], engineer_features,
        centrality_map=c['encoders'].get('cmap'), graph=c['graph']
    )

    base = result.get('base', {})
    best_cf = result.get('best_counterfactual')
    actual_res = round(event_row.get('resolution_minutes', 0), 1)
    potential_saved = round(actual_res - base.get('resolution', 0), 1)
    if potential_saved < 0:
        potential_saved = 0

    event_start_dt = ''
    try:
        from datetime import datetime
        start_str = event_row.get('start_datetime', '')
        if start_str:
            event_start_dt = pd.to_datetime(start_str, utc=True).isoformat()
    except Exception:
        pass

    autopsy_payload = {
        "point_of_no_return_minutes": result.get('time_to_failure_min', 0),
        "point_of_no_return_time": result.get('point_of_no_return_time', '--:--'),
        "decision_window_minutes": result.get('decision_window_min', 0),
        "actual_resolution_minutes": actual_res,
        "potential_delay_saved": potential_saved,
        "cascade_prevented": result.get('preventable', False),
        "event_start": result.get('event_start', '--:--'),
        "event_start_dt": event_start_dt,
    } if result else None

    return _clean_json({
        "event": {
            "id": event_row.get('id', ''),
            "event_cause": event_row.get('event_cause', ''),
            "corridor": event_row.get('corridor', ''),
            "junction": event_row.get('junction', ''),
            "resolution_minutes": actual_res,
            "priority": event_row.get('priority', ''),
            "impact_level": int(event_row.get('impact_level', 1)),
            "impact_label": _get_impact_label(int(event_row.get('impact_level', 1))),
        },
        "autopsy": autopsy_payload,
        "timeline": [],
    })


@app.post("/api/resources")
def get_resources(input_data: ResourceInput):
    impact_level = 2 if input_data.priority == 'High' else 0
    if input_data.event_cause in ['public_event', 'procession']:
        impact_level = max(impact_level, 2)
    if input_data.requires_road_closure:
        impact_level = min(impact_level + 1, 3)

    resources = recommend_resources(impact_level, input_data.event_cause,
                                    input_data.requires_road_closure, input_data.corridor, input_data.hour)

    return {
        "impact_level": impact_level,
        "impact_label": _get_impact_label(impact_level),
        "resources": resources,
        "reference_table": [
            {"impact": v['impact'], "officers": v['officers'],
             "barricades": v['barricades'], "monitoring": v['monitoring'],
             "diversion": v['diversion']}
            for v in IMPACT_RESOURCE_MAP.values()
        ]
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
