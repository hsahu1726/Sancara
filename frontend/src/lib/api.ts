const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

import type {
  DashboardStats, VulnerabilityItem, PredictionInput, PredictionResult,
  SimilarityInput, SimilarEvent, HotspotSummary, AutopsyResponse,
  AutopsyEvent, ResourceInput, ResourceResponse,
} from '@/types';

export const api = {
  getDashboardStats: () => fetchJSON<DashboardStats>('/api/dashboard/stats'),
  getVulnerability: (topN = 20, minEvents = 5) =>
    fetchJSON<VulnerabilityItem[]>(`/api/dashboard/vulnerability?top_n=${topN}&min_events=${minEvents}`),
  predict: (data: PredictionInput) =>
    fetchJSON<PredictionResult>('/api/predict', { method: 'POST', body: JSON.stringify(data) }),
  similarity: (data: SimilarityInput) =>
    fetchJSON<{ results: SimilarEvent[] }>('/api/similarity', { method: 'POST', body: JSON.stringify(data) }),
  getHotspots: (cause?: string) =>
    fetchJSON<HotspotSummary | { cause: string; hotspots: any[] }>(cause ? `/api/hotspots?cause=${cause}` : '/api/hotspots'),
  getEventsForAutopsy: (limit = 100) =>
    fetchJSON<{ events: AutopsyEvent[] }>(`/api/events?limit=${limit}`),
  runAutopsy: (eventId: string) =>
    fetchJSON<AutopsyResponse>('/api/autopsy', { method: 'POST', body: JSON.stringify({ event_id: eventId }) }),
  getResources: (data: ResourceInput) =>
    fetchJSON<ResourceResponse>('/api/resources', { method: 'POST', body: JSON.stringify(data) }),
};
