# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import OneHotEncoder
import warnings
warnings.filterwarnings('ignore')


def build_event_graph(df, max_nodes=50, min_similarity=0.2,
                      filter_cause=None, filter_zone=None):
    df = df.copy().dropna(subset=['start_datetime'])

    if filter_cause and filter_cause != 'All':
        df = df[df['event_cause'].astype(str).str.lower().str.strip() == filter_cause.lower().strip()]
    if filter_zone and filter_zone != 'All':
        df = df[df['zone'].astype(str).str.lower().str.strip() == filter_zone.lower().strip()]

    if len(df) < 5:
        return pd.DataFrame(), pd.DataFrame()

    if len(df) > max_nodes:
        df = df.head(max_nodes)

    cat_cols = ['event_cause', 'corridor', 'zone', 'event_type', 'priority']
    for col in cat_cols:
        df[col] = df[col].astype(str).str.lower().str.strip().fillna('unknown')

    if 'junction' in df.columns:
        df['junction'] = df['junction'].astype(str).str.lower().str.strip().fillna('unknown').str.replace(' ', '')

    cat_for_encoding = [c for c in cat_cols if c in df.columns]
    if 'junction' in df.columns:
        cat_for_encoding.append('junction')

    encoder = OneHotEncoder(sparse_output=True, handle_unknown='ignore')
    features = encoder.fit_transform(df[cat_for_encoding])

    pca = PCA(n_components=2, random_state=42)
    pos = pca.fit_transform(features.toarray())

    sim = cosine_similarity(features)

    edges = []
    for i in range(len(df)):
        for j in range(i + 1, len(df)):
            if sim[i][j] >= min_similarity:
                edges.append({
                    'source': i, 'target': j,
                    'weight': round(float(sim[i][j]), 3)
                })

    degree = np.zeros(len(df), dtype=int)
    for e in edges:
        degree[e['source']] += 1
        degree[e['target']] += 1

    nodes = []
    for i in range(len(df)):
        row = df.iloc[i]
        nodes.append({
            'id': i,
            'event_id': str(row.get('id', i)),
            'event_cause': row.get('event_cause', 'unknown'),
            'corridor': row.get('corridor', 'unknown'),
            'zone': row.get('zone', 'unknown'),
            'junction': row.get('junction', 'unknown'),
            'priority': row.get('priority', 'unknown'),
            'event_type': row.get('event_type', 'unknown'),
            'impact_level': int(row.get('impact_level', 0)) if pd.notna(row.get('impact_level')) else 0,
            'resolution_minutes': round(float(row.get('resolution_minutes', 0)), 0) if pd.notna(row.get('resolution_minutes')) else 0,
            'x': float(pos[i, 0]),
            'y': float(pos[i, 1]),
            'degree': int(degree[i])
        })

    return pd.DataFrame(nodes), pd.DataFrame(edges)


def get_graph_stats(nodes_df, edges_df):
    if nodes_df.empty:
        return {}
    num_clusters = 0
    if not edges_df.empty and len(nodes_df) > 0:
        adj = {i: set() for i in nodes_df['id']}
        for _, e in edges_df.iterrows():
            adj[e['source']].add(e['target'])
            adj[e['target']].add(e['source'])
        visited = set()
        for n in nodes_df['id']:
            if n not in visited:
                num_clusters += 1
                stack = [n]
                while stack:
                    v = stack.pop()
                    if v not in visited:
                        visited.add(v)
                        stack.extend(adj[v] - visited)

    return {
        'nodes': len(nodes_df),
        'edges': len(edges_df),
        'clusters': num_clusters,
        'avg_degree': round(float(nodes_df['degree'].mean()), 1) if len(nodes_df) > 0 else 0,
        'max_degree': int(nodes_df['degree'].max()) if len(nodes_df) > 0 else 0,
        'pca_explained_var': None
    }
