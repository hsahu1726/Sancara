# -*- coding: utf-8 -*-
"""
Sancara — Feature Engineering (leakage-safe)
==============================================
Builds the model feature matrix and *honest* prediction targets.

Design decisions (see also the project's data-quality findings):

  * Resolution time is heavily right-censored: only ~74 events carry a real
    `resolved_datetime`; the rest use `closed_datetime`, an ADMINISTRATIVE close
    (90th pct ≈ 11.6 days). We therefore expose survival bounds (`y_lower`,
    `y_upper`) so the model can treat admin-closes as INTERVAL-censored upper
    bounds and still-active events as RIGHT-censored — used by the XGBoost AFT
    regressor instead of trusting (or discarding) the corrupt values.

  * The impact target is OUTCOME-grounded where a trustworthy duration exists
    (duration band), and falls back to a fixed cause-severity prior elsewhere —
    instead of silently defaulting 61% of rows to "Medium" as the old code did.
    A `sample_weight` down-weights the prior-imputed rows.

  * No leakage: label-encoders, smoothed target-encodings and the scaler are fit
    on the TRAIN slice only (train.py splits chronologically first). `status`
    (active/closed/resolved) is NOT a feature — it leaks the outcome.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
import warnings
warnings.filterwarnings('ignore')

# A trustworthy administrative close is assumed to track real clearance only if
# it lands within this many minutes; beyond it we treat the value as censored.
RELIABLE_CAP_MIN = 720.0      # 12 hours
CLIP_CAP_MIN = 1440.0         # winsorise durations to 24h for band/regression
TE_SMOOTHING = 10.0           # Bayesian smoothing strength for target encoding

# Fixed (data-independent → non-leaky) severity prior per event cause, 0..3.
CAUSE_SEVERITY_PRIOR = {
    'public_event': 3, 'procession': 3, 'vip_movement': 3, 'protest': 3,
    'accident': 2, 'tree_fall': 2, 'water_logging': 2, 'congestion': 2,
    'construction': 2, 'road_conditions': 1, 'pot_holes': 1,
    'vehicle_breakdown': 1, 'debris': 1, 'others': 1, 'unknown': 1,
}

ENGINEERED_FEATURE_COLS = [
    'hour', 'day_of_week', 'month', 'is_weekend', 'is_peak_hour', 'is_night',
    'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos',
    'event_type_planned', 'event_type_unplanned',
    'requires_road_closure', 'priority_High', 'priority_Low',
    'cause_encoded', 'corridor_encoded', 'zone_encoded', 'junction_encoded',
    'police_station_encoded',
    'cause_avg_resolution', 'cause_event_count',
    'corridor_avg_resolution', 'corridor_event_count',
    'zone_avg_resolution', 'zone_event_count',
    'junction_avg_resolution', 'junction_event_count',
    'junction_betweenness', 'junction_degree_net', 'junction_eigenvector',
]

_CAT_COLS = ['event_cause', 'corridor', 'zone', 'junction', 'police_station']


def parse_datetime(df, col):
    return pd.to_datetime(df[col], utc=True, errors='coerce')


# ---------------------------------------------------------------------------
# resolution / censoring
# ---------------------------------------------------------------------------
def compute_resolution_time(df):
    """Raw observed minutes from start to (resolved | closed), clipped >= 0."""
    resolved = parse_datetime(df, 'resolved_datetime')
    closed = parse_datetime(df, 'closed_datetime')
    start = parse_datetime(df, 'start_datetime')
    end = resolved.fillna(closed)
    minutes = (end - start).dt.total_seconds() / 60.0
    return minutes.clip(lower=0)


def compute_survival_bounds(df):
    """
    Returns a frame with:
      raw_minutes        observed start->end minutes (NaN if no end)
      resolved_present   true resolution timestamp exists (uncensored)
      reliable           trustworthy duration (resolved, or admin-close <= cap)
      y_lower / y_upper  AFT survival bounds in minutes:
                           uncensored  -> [d, d]
                           interval    -> [1, d]    (closed: cleared within d)
                           right-cens. -> [elapsed, +inf]  (still active)
    """
    resolved = parse_datetime(df, 'resolved_datetime')
    closed = parse_datetime(df, 'closed_datetime')
    start = parse_datetime(df, 'start_datetime')
    status = df['status'].astype(str).str.lower().str.strip() if 'status' in df.columns \
        else pd.Series('unknown', index=df.index)

    resolved_present = resolved.notna()
    closed_present = closed.notna()
    end = resolved.fillna(closed)
    raw = (end - start).dt.total_seconds() / 60.0
    raw = raw.where(raw >= 0)

    reliable = resolved_present | (closed_present & (raw <= RELIABLE_CAP_MIN) & (raw > 0))

    n = len(df)
    y_lower = np.full(n, np.nan)
    y_upper = np.full(n, np.nan)

    rv = resolved_present.to_numpy()
    cp = (closed_present & ~resolved_present).to_numpy()
    rawv = raw.to_numpy()

    # uncensored: exact resolution
    m = rv & np.isfinite(rawv) & (rawv > 0)
    y_lower[m] = rawv[m]
    y_upper[m] = rawv[m]

    # interval-censored: closed admin -> cleared somewhere in (0, raw]
    m = cp & np.isfinite(rawv) & (rawv > 0)
    y_lower[m] = 1.0
    y_upper[m] = rawv[m]

    # right-censored: still active, no end -> at least the elapsed time
    ref = start.max()
    elapsed = (ref - start).dt.total_seconds() / 60.0
    active = (status == 'active').to_numpy() & ~np.isfinite(y_lower)
    y_lower[active] = np.clip(elapsed.to_numpy()[active], 1.0, None)
    y_upper[active] = np.inf

    return pd.DataFrame({
        'raw_minutes': raw.to_numpy(),
        'resolved_present': resolved_present.to_numpy(),
        'reliable': reliable.to_numpy(),
        'y_lower': y_lower,
        'y_upper': y_upper,
    }, index=df.index)


def duration_band(minutes):
    """0 Quick(<1h) | 1 Moderate(1-3h) | 2 Extended(3-8h) | 3 Prolonged(>8h)."""
    m = np.clip(minutes, 0, CLIP_CAP_MIN)
    band = np.where(m <= 60, 0, np.where(m <= 180, 1, np.where(m <= 480, 2, 3)))
    return band.astype(int)


DURATION_BAND_LABELS = {0: 'Quick (<1h)', 1: 'Moderate (1-3h)',
                        2: 'Extended (3-8h)', 3: 'Prolonged (>8h)'}


# ---------------------------------------------------------------------------
# targets
# ---------------------------------------------------------------------------
def create_impact_target(df, surv):
    """
    Operational impact 0..3 as a COMPOSITE SEVERITY INDEX.

    To avoid the old two-process mismatch (duration-band on reliable rows vs a
    flat default elsewhere), impact is a single continuous severity score driven
    primarily by *known* operational indicators — cause severity, priority, road
    closure, peak hour, major corridor — nudged by the observed duration band
    only where a trustworthy duration exists. The score is then bucketed to
    Low/Medium/High/Critical. This is a consistent, learnable triage label.

    Returns (impact, sample_weight). Weight is 1.0 everywhere (every row now has
    a principled label) except slightly lower for fully duration-unknown rows.
    """
    cause = df['event_cause'].astype(str).str.lower().str.strip()
    closure = df['requires_road_closure'].astype(bool).to_numpy() \
        if 'requires_road_closure' in df.columns else np.zeros(len(df), bool)
    priority_high = (df['priority'].astype(str).str.lower().str.strip() == 'high').to_numpy()
    corridor = df['corridor'].astype(str).str.lower().str.strip()
    major_corridor = (~corridor.isin(['non-corridor', 'unknown', 'nan', ''])).to_numpy()
    hr = parse_datetime(df, 'start_datetime').dt.hour
    is_peak = (((hr >= 8) & (hr <= 10)) | ((hr >= 17) & (hr <= 20))).fillna(False).to_numpy()

    reliable = surv['reliable'].to_numpy()
    band = duration_band(surv['raw_minutes'].fillna(0).to_numpy())
    prior = cause.map(CAUSE_SEVERITY_PRIOR).fillna(1).astype(float).to_numpy()

    score = prior.copy()
    score += 0.5 * priority_high
    score += 1.0 * closure
    score += 0.3 * is_peak
    score += 0.3 * major_corridor
    # duration nudge only where reliable
    dur_nudge = np.where(reliable, np.where(band >= 2, 0.7, np.where(band == 0, -0.5, 0.0)), 0.0)
    score += dur_nudge

    impact = np.select([score < 1.2, score < 2.2, score < 3.2], [0, 1, 2], default=3).astype(int)
    weight = np.where(reliable, 1.0, 0.85)
    return impact, weight


def create_prolonged_target(surv, threshold_min=60.0):
    """Binary: will the disruption run longer than `threshold_min`? (reliable rows)."""
    raw = surv['raw_minutes'].fillna(0).to_numpy()
    return (raw > threshold_min).astype(int)


def create_cascade_target(impact, surv):
    """
    Escalation/cascade flag: a high-severity event that ALSO ran long.
    Uses reliable durations; unreliable rows can still cascade via impact==3.
    """
    reliable = surv['reliable'].to_numpy()
    raw = surv['raw_minutes'].fillna(0).to_numpy()
    long_run = reliable & (raw > 240)        # > 4h actual disruption
    cascade = ((impact >= 2) & long_run) | (impact >= 3)
    return cascade.astype(int)


# ---------------------------------------------------------------------------
# feature transforms (leakage-safe)
# ---------------------------------------------------------------------------
def _normalize_cats(df):
    df = df.copy()
    for c in _CAT_COLS:
        if c in df.columns:
            df[c] = df[c].astype(str).str.lower().str.strip().replace('nan', 'unknown').fillna('unknown')
    if 'junction' in df.columns:
        df['junction'] = df['junction'].str.replace(' ', '')
    return df


def _time_features(df):
    dt = parse_datetime(df, 'start_datetime')
    f = pd.DataFrame(index=df.index)
    f['hour'] = dt.dt.hour.fillna(12).astype(int)
    f['day_of_week'] = dt.dt.dayofweek.fillna(0).astype(int)
    f['month'] = dt.dt.month.fillna(1).astype(int)
    f['is_weekend'] = f['day_of_week'].isin([5, 6]).astype(int)
    f['is_peak_hour'] = (((f['hour'] >= 8) & (f['hour'] <= 10)) |
                         ((f['hour'] >= 17) & (f['hour'] <= 20))).astype(int)
    f['is_night'] = (f['hour'] < 6).astype(int)
    f['hour_sin'] = np.sin(2 * np.pi * f['hour'] / 24)
    f['hour_cos'] = np.cos(2 * np.pi * f['hour'] / 24)
    f['dow_sin'] = np.sin(2 * np.pi * f['day_of_week'] / 7)
    f['dow_cos'] = np.cos(2 * np.pi * f['day_of_week'] / 7)
    return f


def _fit_encoders(df, surv, centrality_map=None):
    """Fit label encoders + smoothed target encodings on the TRAIN slice only."""
    df = _normalize_cats(df)
    res = surv['raw_minutes'].clip(upper=CLIP_CAP_MIN)
    global_mean = float(res[surv['reliable']].mean()) if surv['reliable'].any() \
        else float(res.dropna().mean() or 0.0)

    encoders = {'global_resolution': global_mean, 'centrality_map': centrality_map or {}}
    for c in _CAT_COLS:
        le = LabelEncoder()
        le.fit(df[c].astype(str))
        encoders[f'le_{c}'] = le
        # smoothed target encoding using reliable durations only (no leak: train slice)
        tmp = pd.DataFrame({'cat': df[c], 'res': res, 'rel': surv['reliable'].to_numpy()})
        tmp = tmp[tmp['rel']]
        grp = tmp.groupby('cat')['res'].agg(['mean', 'count'])
        smooth = ((grp['count'] * grp['mean'] + TE_SMOOTHING * global_mean) /
                  (grp['count'] + TE_SMOOTHING))
        encoders[f'te_{c}'] = {'mean': smooth.to_dict(),
                               'count': grp['count'].to_dict()}
    return encoders


def _transform(df, encoders, feature_only=False):
    df = _normalize_cats(df)
    out = pd.DataFrame(index=df.index)

    tf = _time_features(df)
    for c in tf.columns:
        out[c] = tf[c]

    et = df['event_type'].astype(str).str.lower().str.strip() if 'event_type' in df.columns \
        else pd.Series('unplanned', index=df.index)
    out['event_type_planned'] = (et == 'planned').astype(int)
    out['event_type_unplanned'] = 1 - out['event_type_planned']
    out['requires_road_closure'] = df['requires_road_closure'].astype(bool).astype(int) \
        if 'requires_road_closure' in df.columns else 0
    ph = (df['priority'].astype(str).str.lower().str.strip() == 'high').astype(int)
    out['priority_High'] = ph
    out['priority_Low'] = 1 - ph

    gmean = encoders.get('global_resolution', 0.0)
    cmap = encoders.get('centrality_map', {})
    for c in _CAT_COLS:
        le = encoders[f'le_{c}']
        classes = set(le.classes_)
        out[f'{c}_encoded'] = df[c].map(
            lambda x, le=le, classes=classes: int(le.transform([x])[0]) if x in classes else -1)
        te = encoders[f'te_{c}']
        out[f'{c}_avg_resolution'] = df[c].map(lambda x, m=te['mean'], g=gmean: m.get(x, g))
        out[f'{c}_event_count'] = df[c].map(lambda x, cc=te['count']: cc.get(x, 0))

    # centrality features (junction-level); unknown -> 0
    j = df['junction']
    out['junction_betweenness'] = j.map(lambda x, m=cmap: m.get(x, {}).get('betweenness_norm', 0.0))
    out['junction_degree_net'] = j.map(lambda x, m=cmap: m.get(x, {}).get('degree', 0))
    out['junction_eigenvector'] = j.map(lambda x, m=cmap: m.get(x, {}).get('eigenvector_norm', 0.0))

    feature_cols = [c for c in ENGINEERED_FEATURE_COLS if c in out.columns]
    X = out[feature_cols].apply(pd.to_numeric, errors='coerce').fillna(0.0)
    return X, feature_cols


def cause_resolution_prior(cause, encoders):
    """Smoothed historical mean resolution (minutes) for an event cause."""
    cause = str(cause).lower().strip()
    te = encoders.get('te_event_cause', {})
    return float(te.get('mean', {}).get(cause, encoders.get('global_resolution', 90.0)))


def display_resolution(aft_pred, cause, encoders, w=0.5):
    """
    Face-valid resolution estimate: shrink the AFT point prediction toward the
    cause's historical prior (robust for sparse causes), clipped to a sane range.
    """
    prior = cause_resolution_prior(cause, encoders)
    return float(np.clip(w * float(aft_pred) + (1 - w) * prior, 10.0, 600.0))


def engineer_features(df, is_train=True, encoders=None, centrality_map=None):
    """
    Unified entry point.

    Returns (X, targets, encoders, feature_cols) for BOTH train and inference
    (consistent arity). `targets` is a dict:
        resolution_minutes, reliable, y_lower, y_upper,
        impact_level, duration_band, cascade, sample_weight
    On inference, pass the `encoders` fitted during training.
    """
    surv = compute_survival_bounds(df)

    if is_train:
        encoders = _fit_encoders(df, surv, centrality_map=centrality_map)
        scaler = StandardScaler()
        X_df, feature_cols = _transform(df, encoders)
        X = scaler.fit_transform(X_df)
        encoders['scaler'] = scaler
        encoders['feature_cols'] = feature_cols
    else:
        if encoders is None:
            raise ValueError("encoders required for inference")
        X_df, feature_cols = _transform(df, encoders)
        scaler = encoders.get('scaler')
        X = scaler.transform(X_df) if scaler is not None else X_df.to_numpy()

    impact, weight = create_impact_target(df, surv)
    targets = {
        'resolution_minutes': surv['raw_minutes'].clip(upper=CLIP_CAP_MIN),
        'reliable': surv['reliable'],
        'y_lower': surv['y_lower'],
        'y_upper': surv['y_upper'],
        'impact_level': pd.Series(impact, index=df.index),
        'duration_band': pd.Series(duration_band(surv['raw_minutes'].fillna(0).to_numpy()),
                                   index=df.index),
        'prolonged': pd.Series(create_prolonged_target(surv), index=df.index),
        'cascade': pd.Series(create_cascade_target(impact, surv), index=df.index),
        'sample_weight': pd.Series(weight, index=df.index),
    }
    return X, targets, encoders, feature_cols
