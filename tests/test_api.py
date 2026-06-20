import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add root folder to sys.path so we can import api.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app

client = TestClient(app)

def test_api_status():
    """Verify that basic metadata properties of the FastAPI app are set correctly."""
    assert app.title == "Sancara API"

def test_get_events_geo():
    """Verify that geo coordinates query for historical hotspots returns a valid event list."""
    response = client.get("/api/events/geo?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert isinstance(data["events"], list)
    if len(data["events"]) > 0:
        event = data["events"][0]
        assert "latitude" in event
        assert "longitude" in event
        assert "event_cause" in event

def test_get_planned():
    """Verify that planned events analytics are aggregated and structured correctly."""
    response = client.get("/api/planned")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "by_cause" in data
    assert "by_corridor" in data

def test_predict_endpoint():
    """Verify that the ML impact forecasting pipeline executes successfully."""
    payload = {
        "event_type": "unplanned",
        "event_cause": "vehicle_breakdown",
        "corridor": "ORR East 1",
        "zone": "Central Zone 2",
        "priority": "Low",
        "requires_road_closure": False,
        "junction": "unknown",
        "hour": 8
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "impact_level" in data
    assert "impact_label" in data
    assert "resolution_minutes" in data
    assert "cascade_probability" in data
