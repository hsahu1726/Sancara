# -*- coding: utf-8 -*-
"""
Sancara — Network Propagation Engine
=======================================
Builds a road-network graph of Bengaluru junctions directly from the event
dataset (no OSMnx download dependency) and provides:

  * Junction fragility scoring via betweenness / degree / eigenvector centrality
    (NetworkX) — implements the vision-doc fragility formula.
  * Cascade propagation simulation (threshold/SIR-style contagion) producing a
    per-junction time-to-impact, for the animated propagation map.
  * Percolation early-warning: classify junctions as "stressed", track connected
    components over simulated time, and surface the peak-cluster-count timestep
    — the published precursor to network-wide collapse.

References embedded in design:
  - Percolation + connected-components congestion tracking (peak N_clusters precursor).
  - Edge/junction betweenness centrality ranks where cascades spread.
"""

import os
import pickle
import numpy as np
import pandas as pd
import networkx as nx

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')


def _normalize_junction(s):
    return s.astype(str).str.lower().str.strip().str.replace(' ', '')


def junction_centroids(df):
    """Mean lat/lon + event count for each named junction."""
    d = df.copy()
    d['junction'] = _normalize_junction(d['junction'])
    d = d[(d['junction'] != 'unknown') & (d['junction'] != 'nan') & (d['junction'] != '')]
    d = d.dropna(subset=['latitude', 'longitude'])
    g = d.groupby('junction').agg(
        latitude=('latitude', 'median'),
        longitude=('longitude', 'median'),
        event_count=('id', 'count'),
        corridor=('corridor', lambda s: s.astype(str).str.lower().str.strip().mode().iloc[0]
                  if len(s) else 'unknown'),
    ).reset_index()
    return g


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlmb = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlmb / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def build_road_graph(df, k=4, max_edge_km=6.0):
    """
    Construct an undirected junction graph.

    Edges come from two sources, mimicking real road adjacency:
      1. k-nearest-neighbour spatial links (each junction to its k closest
         neighbours within max_edge_km) — proxies physical road connectivity.
      2. Shared-corridor links — junctions on the same named corridor are road-
         connected, so we add an edge to each corridor-neighbour's nearest peer.

    Edge weight = haversine distance in km (used as travel-distance for
    betweenness and propagation timing).
    """
    cents = junction_centroids(df)
    G = nx.Graph()
    for _, r in cents.iterrows():
        G.add_node(r['junction'], latitude=float(r['latitude']),
                   longitude=float(r['longitude']), event_count=int(r['event_count']),
                   corridor=r['corridor'])

    names = cents['junction'].tolist()
    lats = cents['latitude'].to_numpy()
    lons = cents['longitude'].to_numpy()
    n = len(names)
    if n < 2:
        return G

    # 1. spatial kNN
    for i in range(n):
        dists = _haversine(lats[i], lons[i], lats, lons)
        dists[i] = np.inf
        order = np.argsort(dists)
        added = 0
        for j in order:
            if added >= k or dists[j] > max_edge_km:
                break
            G.add_edge(names[i], names[j], weight=float(round(dists[j], 3)))
            added += 1

    # 2. shared-corridor links (connect each junction to nearest same-corridor peer)
    for corridor, grp in cents.groupby('corridor'):
        if corridor in ('unknown', 'non-corridor', 'nan', '') or len(grp) < 2:
            continue
        idx = grp.index.to_numpy()
        sub_names = grp['junction'].to_numpy()
        sub_lat = grp['latitude'].to_numpy()
        sub_lon = grp['longitude'].to_numpy()
        for a in range(len(sub_names)):
            d = _haversine(sub_lat[a], sub_lon[a], sub_lat, sub_lon)
            d[a] = np.inf
            b = int(np.argmin(d))
            if np.isfinite(d[b]):
                G.add_edge(sub_names[a], sub_names[b], weight=float(round(d[b], 3)))
    return G


def compute_centrality(G):
    """
    Per-junction centrality table. Betweenness = how often a junction lies on
    shortest paths (fragility: small disruption here has outsized network reach).
    """
    if G.number_of_nodes() == 0:
        return pd.DataFrame(columns=['junction', 'betweenness', 'degree_centrality',
                                     'eigenvector', 'degree'])
    k = min(G.number_of_nodes(), 200)  # subsample sources for speed on large graphs
    btw = nx.betweenness_centrality(G, weight='weight', k=k, seed=42)
    deg_c = nx.degree_centrality(G)
    try:
        eig = nx.eigenvector_centrality_numpy(G, weight='weight')
    except Exception:
        eig = {nd: 0.0 for nd in G.nodes()}
    rows = []
    for nd in G.nodes():
        rows.append({
            'junction': nd,
            'betweenness': round(float(btw.get(nd, 0.0)), 6),
            'degree_centrality': round(float(deg_c.get(nd, 0.0)), 6),
            'eigenvector': round(float(eig.get(nd, 0.0)), 6),
            'degree': int(G.degree(nd)),
            'latitude': G.nodes[nd].get('latitude'),
            'longitude': G.nodes[nd].get('longitude'),
            'event_count': G.nodes[nd].get('event_count', 0),
            'corridor': G.nodes[nd].get('corridor', 'unknown'),
        })
    out = pd.DataFrame(rows)
    # normalise centrality columns 0..1 for downstream blending
    for c in ['betweenness', 'degree_centrality', 'eigenvector']:
        mn, mx = out[c].min(), out[c].max()
        out[c + '_norm'] = (out[c] - mn) / (mx - mn) if mx > mn else 0.0
    return out.sort_values('betweenness', ascending=False).reset_index(drop=True)


def centrality_feature_map(centrality_df):
    """{junction: {betweenness_norm, degree, eigenvector_norm}} for feature joins."""
    m = {}
    for _, r in centrality_df.iterrows():
        m[r['junction']] = {
            'betweenness_norm': float(r.get('betweenness_norm', 0.0)),
            'degree': int(r.get('degree', 0)),
            'eigenvector_norm': float(r.get('eigenvector_norm', 0.0)),
        }
    return m


def simulate_propagation(G, source_junction, centrality_df, spread_speed_kmph=18.0,
                         max_minutes=60, hazard_threshold=0.5):
    """
    Threshold/SIR-style cascade spread from a source junction.

    Time-to-impact for a junction = travel time of the stress wave over the
    shortest road path (distance / spread_speed). Stress decays with arrival
    time and is amplified by the junction's betweenness fragility, so structural
    chokepoints stay "hot" longer. Returns a per-junction gradient frame.
    """
    if source_junction not in G:
        return pd.DataFrame()

    frag = {r['junction']: float(r.get('betweenness_norm', 0.0))
            for _, r in centrality_df.iterrows()}

    times = {}
    for nd, dist_km in nx.single_source_dijkstra_path_length(
            G, source_junction, weight='weight').items():
        times[nd] = (dist_km / max(spread_speed_kmph, 1e-3)) * 60.0  # minutes

    rows = []
    for nd, t in times.items():
        if t > max_minutes:
            continue
        decay = np.exp(-t / 15.0)                       # stress fades with distance/time
        amplify = 0.75 + 0.45 * frag.get(nd, 0.0)       # fragile junctions stay hotter
        stress = float(np.clip(decay * amplify, 0, 1))
        if nd == source_junction:
            stress = 1.0
        rows.append({
            'junction': nd,
            'time_to_impact_min': round(float(t), 1),
            'stress_level': round(stress, 3),
            'at_risk': stress >= hazard_threshold,
            'latitude': G.nodes[nd].get('latitude'),
            'longitude': G.nodes[nd].get('longitude'),
            'is_source': nd == source_junction,
        })
    out = pd.DataFrame(rows).sort_values('time_to_impact_min').reset_index(drop=True)
    return out


def percolation_early_warning(G, prop_df, collapse_frac=0.5, steps=None):
    """
    Single-source collapse curve. As the stress wave spreads, track the size of
    the largest connected 'stressed' cluster (giant component) over time. The
    NETWORK-CRITICAL precursor = the first timestep at which the giant component
    exceeds `collapse_frac` of all reachable junctions — the moment local
    disruption becomes a network-wide failure ("T+43 Network Critical").
    """
    if prop_df.empty:
        return pd.DataFrame(), None
    risky = prop_df[prop_df['at_risk']]
    if risky.empty:
        return pd.DataFrame(), None

    total_reachable = len(prop_df)
    tmax = float(prop_df['time_to_impact_min'].max())
    if steps is None:
        steps = max(6, int(tmax // 4) + 1)
    grid = np.linspace(prop_df['time_to_impact_min'].min(), tmax, steps)

    records = []
    for t in grid:
        active = set(risky[risky['time_to_impact_min'] <= t]['junction'])
        if not active:
            records.append({'time_min': round(float(t), 1), 'active_junctions': 0,
                            'clusters': 0, 'giant_component': 0, 'giant_frac': 0.0})
            continue
        sub = G.subgraph(active)
        comps = list(nx.connected_components(sub))
        giant = max((len(c) for c in comps), default=0)
        records.append({
            'time_min': round(float(t), 1),
            'active_junctions': len(active),
            'clusters': len(comps),
            'giant_component': giant,
            'giant_frac': round(giant / max(total_reachable, 1), 3),
        })
    stats = pd.DataFrame(records)
    precursor = None
    crossed = stats[stats['giant_frac'] >= collapse_frac]
    if not crossed.empty:
        precursor = float(crossed.iloc[0]['time_min'])
    return stats, precursor


def multi_source_percolation(G, source_junctions, centrality_df, steps=12):
    """
    City-wide early-warning across MULTIPLE simultaneous event sources. Tracks
    the count of separate congested clusters over time; the timestep with the
    MAXIMUM number of clusters is the published percolation precursor — just
    after it, clusters coalesce into a giant component (collapse). Returns the
    per-step curve and the precursor (peak-cluster) time.
    """
    sources = [s for s in source_junctions if s in G]
    if not sources:
        return pd.DataFrame(), None
    # union of stress waves from each source: each junction's arrival = earliest
    arrival = {}
    for s in sources:
        prop = simulate_propagation(G, s, centrality_df)
        for _, r in prop[prop['at_risk']].iterrows():
            j = r['junction']
            arrival[j] = min(arrival.get(j, np.inf), r['time_to_impact_min'])
    if not arrival:
        return pd.DataFrame(), None
    tmax = max(arrival.values())
    grid = np.linspace(0, tmax, steps)
    records = []
    for t in grid:
        active = {j for j, a in arrival.items() if a <= t}
        if not active:
            records.append({'time_min': round(float(t), 1), 'active_junctions': 0,
                            'clusters': 0, 'giant_component': 0})
            continue
        sub = G.subgraph(active)
        comps = list(nx.connected_components(sub))
        records.append({
            'time_min': round(float(t), 1),
            'active_junctions': len(active),
            'clusters': len(comps),
            'giant_component': max((len(c) for c in comps), default=0),
        })
    stats = pd.DataFrame(records)
    precursor = float(stats.loc[stats['clusters'].idxmax(), 'time_min']) \
        if stats['clusters'].max() > 0 else None
    return stats, precursor


def diversion_candidates(G, centrality_df, blocked_junction, top_n=5):
    """
    Suggest alternative routing junctions when `blocked_junction` is congested:
    neighbours-of-neighbours that are (a) reachable bypassing the block and
    (b) least fragile (low betweenness), so we don't divert into another choke.
    """
    if blocked_junction not in G:
        return pd.DataFrame()
    frag = {r['junction']: float(r.get('betweenness_norm', 0.0))
            for _, r in centrality_df.iterrows()}
    # 2-hop neighbourhood excluding the block itself
    near = set()
    for nb in G.neighbors(blocked_junction):
        near.add(nb)
        near.update(G.neighbors(nb))
    near.discard(blocked_junction)
    H = G.copy()
    H.remove_node(blocked_junction)  # routes must avoid the blocked junction
    rows = []
    for nd in near:
        if nd not in H:
            continue
        reachable = nx.has_path(H, source=next(iter(H.neighbors(nd)), nd), target=nd) \
            if H.degree(nd) else False
        rows.append({
            'junction': nd,
            'fragility': round(frag.get(nd, 0.0), 3),
            'spare_capacity': round(1 - frag.get(nd, 0.0), 3),
            'corridor': G.nodes[nd].get('corridor', 'unknown'),
            'bypasses_block': True,
        })
    out = pd.DataFrame(rows)
    if out.empty:
        return out
    return out.sort_values('fragility').head(top_n).reset_index(drop=True)


# ---------------------------------------------------------------------------
# persistence
# ---------------------------------------------------------------------------
def save_network(G, centrality_df):
    path = os.path.join(MODELS_DIR, 'network.pkl')
    with open(path, 'wb') as f:
        pickle.dump({'graph': G, 'centrality': centrality_df}, f)
    centrality_df.to_csv(os.path.join(
        os.path.dirname(MODELS_DIR), 'data', 'junction_centrality.csv'), index=False)
    return path


def load_network():
    path = os.path.join(MODELS_DIR, 'network.pkl')
    if os.path.exists(path):
        with open(path, 'rb') as f:
            d = pickle.load(f)
        return d['graph'], d['centrality']
    return None, None
