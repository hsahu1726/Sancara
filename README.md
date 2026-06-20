# Sañcāra

<p align="center">
  <img src="assets/logo.png" width="400" alt="Sañcāra Logo"/>
</p>

<p align="center">
  <strong>Operational Intelligence for Urban Traffic Networks</strong><br/>
  Flipkart GRID Hackathon &nbsp;|&nbsp; Theme 2: Event-Driven Congestion
</p>

---

## 2. Introduction

**Sañcāra** is an AI-powered urban mobility operations platform designed for traffic management centers. Using network analytics, corridor intelligence, and resource planning models trained on **8,173 historical Bengaluru traffic events**, it helps operators anticipate disruption, plan diversion routes, and optimize field deployments to restore mobility faster.



---

## 3. System Architecture

Sañcāra uses a decoupled client-server architecture. The Next.js client interacts with the FastAPI backend via REST API endpoints.

```mermaid
graph TB
    subgraph Presentation_Layer["Presentation Layer (Next.js client)"]
        UI["Next.js Web Interface"]
        Overview["Dashboard KPI & Area Charts"]
        Predict["Prediction Panel: Weather & Friction Inputs"]
        Detour["Bypass Maps: Corridor Diversions"]
        Copilot["Sancara Copilot: Chat Assistant"]
    end

    subgraph Service_Layer["Service Layer (FastAPI server)"]
        Router["FastAPI Application"]
        Pydantic["Pydantic Input Validators"]
        CORS["CORS Middleware Configuration"]
    end

    subgraph Analytics_Layer["Analytics & ML Engine"]
        FE["Feature Pipeline: Cyclical Time & Encoders"]
        XG["XGBoost Models: Impact, Prolonged, Recovery"]
        Calib["Isotonic Disruption Calibrator"]
        NetX["NetworkX Corridor Route Graphs"]
        Replay["Response Replay counterfactuals"]
        Recovery["Expected Recovery Horizon Estimator"]
    end

    subgraph Data_Layer["Data & Persistence Layer"]
        DB["dataset.csv (Historical Records)"]
        Models["Serialized Models (*.pkl, *.ubj)"]
        Logs["predictions_log.csv (Live Logs)"]
    end

    subgraph Notification_Layer["Notification & Alert Systems"]
        SMS["SMS Warning Dispatcher"]
        WhatsApp["WhatsApp Alert Dispatcher"]
    end

    UI --> Router
    Router --> Pydantic
    Pydantic --> FE
    FE --> XG & Calib & NetX & Replay & Recovery
    XG --> Models
    NetX & Replay --> DB
    Router --> Logs
    Predict --> SMS & WhatsApp
```

### Directory Structure
```
api.py                     FastAPI backend endpoints
train.py                   Model training & serialization pipeline
src/
  feature_engineering.py   Friction indices, cyclical temporal & network centrality features
  models.py                Model loading wrappers & prediction pipelines
  network.py               Junction routing, corridor graphs, & propagation
  ttf.py                   Expected Recovery Horizon & Response Urgency Window (RUW)
  cascade_autopsy.py       Response Replay counterfactual engine
  black_box.py             Incident reconstruction & delay accounting
  early_warning.py         Pre-event risk indexing
  post_event.py            Prediction drift & calibration logs
  explain.py               SHAP local explainability waterfalls
  vulnerability.py         Junction fragility scoring
  similarity.py            TF-IDF event similarity matching
  hotspot_detection.py     DBSCAN spatial event clustering
  resources.py             Context-aware resource recommendation mappings
frontend/                  Next.js Web Application
```

---

## 4. Operational Data Flowchart

```mermaid
graph TD
    A[Event Reported: Cause, Corridor, Road Closure] --> B[Calculate Feature Vectors: cyclical time, rain, Urban Friction Index]
    B --> C[ML Inference Engine]
    C --> D[Predict Disruption Severity]
    C --> E[Estimate Expected Recovery Horizon]
    C --> F[Assess Disruption Probability]
    D & E & F --> G[Calculate Response Urgency Window RUW]
    G --> H[Render UI: Recommend Diversions & Resource Allocations]
    H --> I[Dispatch Warnings: SMS/WhatsApp Alerts to Field Officers]
    I --> J[Post-Event Learning Loop: Log outcome & monitor drift]
```

---

## 5. ML Pipeline

Sañcāra features clean temporal splitting (Train: Nov 2023 – Mar 2024; Held-out Test: Mar – Apr 2024).

- **Expected Recovery Horizon:** Uses Accelerated Failure Time (AFT) survival regression (`survival:aft`) to model true clearance times while accounting for right-censored active events.
- **Calibrated Disruption Probability:** Employs Isotonic Calibration to reduce the Brier score to `0.038`, matching predicted risks to actual frequencies.
- **Explainability:** Surfaced via local tree-SHAP value contributions directly inside the dashboard.

| Model | Task | Technique | Result |
|---|---|---|---|
| **Disruption Classifier** | Will it cause high disruption? | XGBoost + Isotonic Calibration | ROC-AUC 0.91, PR-AUC 0.64, Brier 0.038 |
| **Impact Classifier** | Severity (Low → Critical) | XGBoost, composite-severity label | 71.3% Accuracy, macro-F1 0.62 |
| **Recovery Horizon (AFT)** | Expected clearance time | XGBoost `survival:aft` | MedAE 60 min on reliable events |
| **Prolonged Disruption** | Disruption > 60 min | XGBoost binary classification | in-dist AUC ~0.61 |

---

## 6. Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Recharts, Leaflet Maps.
- **Backend API:** FastAPI, Uvicorn, Pydantic.
- **Analytics & ML:** XGBoost, Scikit-Learn, Pandas, NumPy, NetworkX.

---

## 7. Local Development Setup

### Backend & Model Training
Ensure Python 3.10+ is installed.

```bash
pip install -r requirements.txt
python train.py
python api.py
```
*Backend runs at `http://localhost:8000`.*

### Frontend Dashboard
Ensure Node.js (v18+) is installed.

```bash
cd frontend
npm install
npm run dev
```
*Web dashboard runs at `http://localhost:3002`.*

---

## 8. Known Limitations

- **Administrative Resolution Censoring:** A substantial portion of historical resolution records are censored due to administrative delay. We handle this through survival bounds (AFT).
- **Composite Disruption Metric:** Ground-truth severity labels are absent in ~70% of historical events. Sañcāra resolves this by calculating a composite severity index during training.
- **Graph Simplification:** The road network graph uses coordinates and Shared Corridor Edges (kNN approximations) instead of a direct OSM import.

---

## 9. Future Scope

- **Advanced Survival Estimators:** Transitioning from parametric AFT to Kaplan-Meier or Cox Proportional Hazards curves categorized by incident causes.
- **OSMnx Graph Integration:** Importing full OpenStreetMap road meshes to enable accurate edge-weight routing.
- **LLM Dispatcher Assistant (Sancara Copilot):** Grounding Sancara Copilot on live model predictions via Retrieval-Augmented Generation (RAG).
- **Urban Friction Index Expansion:** Integrating enforcement and illegal parking intelligence (Theme 1) directly into the prediction loops.
- **Reinforcement Learning Routing:** Optimizing detour configurations dynamically.

---

## 10. Team Members

- **Harsh Sahu**
- **Yash Chawla**
- **Barsha Mondal**
- **Arpan Kark**