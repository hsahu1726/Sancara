# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import pickle
import os

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')


def build_event_text_profile(row):
    parts = [
        str(row.get('event_cause', '')),
        str(row.get('corridor', '')),
        str(row.get('zone', '')),
        str(row.get('junction', '')),
        str(row.get('event_type', '')),
        str(row.get('priority', '')),
        str(row.get('police_station', ''))
    ]
    return ' '.join(parts).lower().strip()


def train_similarity_engine(df):
    profiles = df.apply(build_event_text_profile, axis=1)
    vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(profiles)

    event_data = df[['id', 'event_cause', 'corridor', 'zone', 'junction',
                     'event_type', 'priority', 'resolution_minutes',
                     'impact_level', 'latitude', 'longitude',
                     'start_datetime']].copy()
    event_data['resolution_minutes'] = event_data['resolution_minutes'].round(1)

    return vectorizer, tfidf_matrix, event_data


def find_similar_events(query_event, vectorizer, tfidf_matrix, event_data, top_k=5):
    profile = build_event_text_profile(query_event)
    query_vec = vectorizer.transform([profile])
    similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()
    top_indices = similarities.argsort()[-top_k:][::-1]

    results = []
    for idx in top_indices:
        sim_score = similarities[idx]
        if sim_score > 0:
            event = event_data.iloc[idx].to_dict()
            event['similarity_score'] = round(float(sim_score), 3)
            results.append(event)

    return results


def save_similarity_engine(vectorizer, tfidf_matrix, event_data):
    path = os.path.join(MODELS_DIR, 'similarity.pkl')
    with open(path, 'wb') as f:
        pickle.dump({
            'vectorizer': vectorizer,
            'tfidf_matrix': tfidf_matrix,
            'event_data': event_data
        }, f)
    return path


def load_similarity_engine():
    path = os.path.join(MODELS_DIR, 'similarity.pkl')
    if os.path.exists(path):
        with open(path, 'rb') as f:
            d = pickle.load(f)
        return d['vectorizer'], d['tfidf_matrix'], d['event_data']
    return None, None, None
