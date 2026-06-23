<p align="center">
  <img src="assets/logo.png" width="400" alt="Sañcāra Logo"/>
</p>

---

## Sañcāra

**Sañcāra** is an AI-powered urban mobility operations platform designed for traffic management centers. Using network analytics, corridor intelligence, and resource planning models trained on **8,173 historical Bengaluru traffic events**, it helps operators anticipate disruption, plan diversion routes, and optimize field deployments to restore mobility faster.

**Live Deployed Prototype:** [sancara-flipkart.vercel.app](https://sancara-flipkart.vercel.app/)



---

## System Architecture

Sañcāra uses a decoupled client-server architecture. The Next.js client interacts with the FastAPI backend via REST API endpoints.

```mermaid
graph LR
    subgraph Presentation_Layer["Presentation Layer (Next.js client)"]
        UI["Next.js Web Interface"]
        Overview["Dashboard KPI & Area Charts"]
        Predict["Prediction Panel: Weather & Friction Inputs"]
        Detour["Bypass Maps: Corridor Diversions"]
        Copilot["Sancara Copilot: Chat Assistant"]
        Broadcast["Kannada Public Broadcast Generator"]
        Heatmap["Historical Hotspot Map"]
        Planned["Planned Event Analysis"]
        Simulator["What-If Simulator"]
        Calendar["Historical Risk Calendar"]
        Tour["Multi-Page Tour Guide"]

        UI --> Overview
        UI --> Predict
        UI --> Detour
        UI --> Copilot
        UI --> Broadcast
        UI --> Heatmap
        UI --> Planned
        UI --> Simulator
        UI --> Calendar
        UI --> Tour
    end

    subgraph Service_Layer["Service Layer (FastAPI server)"]
        Router["FastAPI Application"]
        Pydantic["Pydantic Input Validators"]
        CORS["CORS Middleware Configuration"]

        Router --> Pydantic
        Router --> CORS
    end

    subgraph Analytics_Layer["Analytics & ML Engine"]
        FE["Feature Pipeline: Cyclical Time & Encoders"]
        XG["XGBoost Models: Impact, Prolonged, Recovery"]
        Calib["Isotonic Disruption Calibrator"]
        NetX["NetworkX Corridor Route Graphs"]
        Replay["Response Replay counterfactuals"]
        Recovery["Expected Recovery Horizon Estimator"]

        FE --> XG & Calib & NetX & Replay & Recovery
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

    %% Core Data & Control Flows
    UI --> Router
    Predict --> Router
    Simulator --> Router
    Copilot --> Router
    
    Pydantic --> FE
    
    XG --> Models
    NetX & Replay --> DB
    Router --> Logs
    Predict --> SMS & WhatsApp
```

---

## Platform Previews

### Core Command & ML Operations
| **Operational Dashboard** | **What-If Simulator** |
| :---: | :---: |
| ![Dashboard](assets/dashboard.png) | ![Simulator](assets/simulator.png) |
| **Historical Hotspot Map** | **Response Replay Autopsy** |
| ![Map](assets/map.png) | ![Autopsy](assets/autopsy.png) |

### AI Copilot & Localized Advisory Suite
| **Kannada Public Broadcaster** | **Sancara AI Copilot** |
| :---: | :---: |
| ![Broadcaster](assets/broadcaster.png) | ![Copilot](assets/copilot.png) |
| **Historical Risk Calendar** | **Planned Event Analysis** |
| ![Calendar](assets/calendar.png) | ![Planned Events](assets/planned.png) |

---

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
  src/app/
    broadcast/             ಕನ್ನಡ (Kannada) Public Broadcast Generator
    heatmap/               Historical Hotspot Map (Leaflet raw coordinates)
    planned/               Planned Event Analysis (breakdowns & peak times)
    simulator/             What-If Scenario Simulator (side-by-side ML predictions)
    calendar/              Historical Risk Calendar (with Monthly Summary sidebar)
  src/components/
    TourGuide.tsx          Interactive Multi-Page Tour Guide component
    Sidebar.tsx            Responsive sidebar navigation component
```

---

## Operational Data Flowchart

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

## Key Features

Sañcāra includes thirteen core features and diagnostic modules designed to support traffic operations:

1. **Dashboard Metrics**: Provides a high-level overview of traffic event trends, spatial distributions, and active incident diagnostics.
2. **Event Impact Prediction**: Predicts congestion severity, estimated resolution time, and resource needs using the XGBoost ML model backend.
3. **Historical Hotspot Map**: Displays raw historical traffic event coordinates in Bangalore on an interactive Leaflet map with location click popups.
4. **Junction Vulnerability Index**: Ranks and highlights critical junctions based on historical incident counts, average delays, and road closures.
5. **Historical Case Search**: Matches and finds similar past traffic incidents in the ASTRAM dataset using Cosine Similarity.
6. **Response Replay & Autopsy**: Performs autopsy analysis on past events to determine counterfactual point-of-no-return and response efficacy.
7. **Corridor Analysis**: Visualizes major Bengaluru corridors, active congestion levels, and junction nodes.
8. **Planned Event Analysis**: Details construction, VIP movements, protests, and processions from the ASTRAM dataset to assess temporal/spatial risk.
9. **What-If Scenario Simulator**: Compares two event configurations side-by-side to evaluate cascading congestion and cascaded delay risks.
10. **Historical Risk Calendar**: Displays a daily heatmap grid of incidents with a vertical monthly summary sidebar showing key averages.
11. **Kannada Public Broadcast Generator**: Generates public traffic advisory announcements in Kannada with English reference translations.
12. **AI Chatbot**: Answers traffic queries and suggests routing and deployment strategies using an LLM chatbot.
13. **Resource Allocator**: Recommends resource allocations (officers, barricades, diversions) based on event priority and road closures.

*Additionally, a global **Interactive Tour Guide** can be activated via a floating blue oval button to guide users through each of these features, alongside a **Dark Mode Toggle** next to the logo to switch application themes.*

---

## ML Pipeline

Sañcāra’s machine learning and feature engineering pipeline is designed for high statistical rigor, leakage prevention, and robust handling of corrupt/censored real-world traffic logs.

### 1. Chronological & Leakage-Safe Splits
To replicate true production deployment, we avoid random splitting (which causes future data to leak into past predictions). We enforce a strict **chronological split**:
* **Training Set:** November 2023 – March 2024 (80% chronological split)
* **Held-out Test Set:** March 2024 – April 2024 (20% honest evaluation)

All feature scalers, encoders, and target encodings (using Bayesian target smoothing with `TE_SMOOTHING = 10.0`) are fitted **only** on the training slice, then applied to transform the test slice. Columns containing target indicators, such as event `status`, are dropped to prevent target leakage.

---

### 2. Core Model Architecture & Techniques

#### AFT Survival Regression (Expected Recovery Horizon)
* **The Problem:** In real-world ASTRAM logs, true resolution times (`resolved_datetime`) are missing or heavily right-censored. Over 90% of events rely on administrative closes (`closed_datetime`), which averages 11.6 days after starting due to batch closure. Training standard regressors directly on these records severely skews predictions.
* **The Solution:** We model traffic incident recovery using survival analysis. Administrative closes are treated as **interval-censored** upper bounds (resolution happened somewhere in the interval `(1, closed_minutes]`) and active records as **right-censored** (clearance will take *at least* the elapsed time). We train an **XGBoost Accelerated Failure Time (AFT) Regressor (`survival:aft`)** on these calculated bounds (`y_lower`, `y_upper`) to predict expected clearance times with low error.

#### Outcome-Grounded Composite Triage (Impact Classifier)
* **The Problem:** Historical records lack ground-truth severity indicators in ~70% of cases, defaulting 61% of raw rows to a generic "Medium" label.
* **The Solution:** We formulate a learnable **composite severity index (0 to 3)**. The index weights known operational variables (priority, road closures, peak hour status, corridor classifications) and nudges the score with the observed duration band *only* on reliable, uncensored events. Impeded rows are downweighted in training using a custom sample-weighting scheme. An **XGBoost Multi-Class Classifier** learns to bucket incidents into low, medium, high, or critical impact.

#### Calibrated Escalation Risk (Cascade Classifier)
* **The Problem:** Raw machine learning probability scores (e.g. "72% cascade chance") are often uncalibrated, meaning a 70% risk model output does not map to 70% of real-world events.
* **The Solution:** We train an **XGBoost Binary Classifier** to predict if an incident will escalate (a high-severity event running >4 hours). An **Isotonic Calibration** layer is fitted on a validation hold-out set, mapping model logits to empirical frequencies. This reduces the Brier score error to **`0.038`**—ensuring predicted risks are mathematically reliable for controllers.

#### Road Network Topology & Graph Centrality (Spatial Engineering)
* **The Problem:** Standard geographical coordinates (latitude/longitude) fail to capture the relational and structural importance of Bengaluru's road grid.
* **The Solution:** We construct a **NetworkX road graph** from historical event routes. Using this graph, we compute topological centrality metrics for every intersection:
  * **Degree Centrality**
  * **Betweenness Centrality** (identifies crucial bottlenecks)
  * **Eigenvector Centrality** (identifies junctions connected to other critical junctions)
  These scores are mapped back to junctions and corridors as features, giving the gradient-boosted trees direct structural awareness of the city's network fragility.

---

### 3. Model Performance Summary

| Model | Task | Technique | Result |
|---|---|---|---|
| **Disruption Classifier** | Will it cause high disruption? | XGBoost + Isotonic Calibration | ROC-AUC 0.91, PR-AUC 0.64, Brier 0.038 |
| **Impact Classifier** | Severity (Low → Critical) | XGBoost, composite-severity label | 71.3% Accuracy, macro-F1 0.62 |
| **Recovery Horizon (AFT)** | Expected clearance time | XGBoost `survival:aft` | MedAE 60 min on reliable events |
| **Prolonged Disruption** | Disruption > 60 min | XGBoost binary classification | in-dist AUC ~0.61 |

---

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Recharts, Leaflet Maps, MapmyIndia (Mappls) Web JS SDK.
- **Backend API:** FastAPI, Uvicorn, Pydantic.
- **Analytics & ML:** XGBoost, Scikit-Learn, Pandas, NumPy, NetworkX.

---

## Local Development Setup

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

## Known Limitations

- **Administrative Resolution Censoring:** A substantial portion of historical resolution records are censored due to administrative delay. We handle this through survival bounds (AFT).
- **Composite Disruption Metric:** Ground-truth severity labels are absent in ~70% of historical events. Sañcāra resolves this by calculating a composite severity index during training.
- **Graph Simplification:** The road network graph uses coordinates and Shared Corridor Edges (kNN approximations) instead of a direct OSM import.

---

## Future Scope

- **Advanced Survival Estimators:** Transitioning from parametric AFT to Kaplan-Meier or Cox Proportional Hazards curves categorized by incident causes.
- **OSMnx Graph Integration:** Importing full OpenStreetMap road meshes to enable accurate edge-weight routing.
- **LLM Dispatcher Assistant (Sancara Copilot):** Grounding Sancara Copilot on live model predictions via Retrieval-Augmented Generation (RAG).
- **Urban Friction Index Expansion:** Integrating enforcement and illegal parking intelligence (Theme 1) directly into the prediction loops.
- **Reinforcement Learning Routing:** Optimizing detour configurations dynamically.

---

## Team- Bangaluru vs Traffic

- **Harsh Sahu**
- **Yash Chawla**
- **Barsha Mondal**
- **Arpan Karak**
