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
  getEventsGeo: (limit = 2000) =>
    fetchJSON<{ events: any[] }>(`/api/events/geo?limit=${limit}`),
  getPlanned: () =>
    fetchJSON<any>('/api/planned'),
};

export function formatJunctionName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'unknown' || lower === 'nan' || lower === 'null' || !trimmed) {
    return '—';
  }
  
  // 1. Separate "junc"/"junction" inside words (e.g. nagatheaterjunc -> nagatheater Junc)
  let res = trimmed.replace(/junc(tion)?/gi, ' Junc');

  // 2. camelCase spaces (e.g. VeerannapalyaJunction -> Veerannapalya Junction)
  res = res.replace(/([a-z])([A-Z])/g, '$1 $2');

  // 3. Replace dashes/underscores with spaced dashes
  res = res.replace(/[-_]+/g, ' - ');

  // 4. Format inside parentheses
  res = res.replace(/\(([^)]+)\)/g, (match, p1) => {
    const formattedP1 = p1
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/,([^\s])/g, ', $1')
      .split(/\s+/)
      .map((w: string) => {
        if (w === w.toUpperCase() && w.length >= 2) return w;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');
    return ` (${formattedP1})`;
  });

  // 5. Clean up spacing and capitalize individual words
  res = res.split(/\s+/).map(w => {
    if (w === '-' || w.startsWith('(') || w.endsWith(')')) return w;
    if (w === w.toUpperCase() && w.length >= 2) return w;
    if (w.toLowerCase() === 'junc') return 'Junc';
    if (w.toLowerCase() === 'junction') return 'Junction';
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');

  // Final cleanup
  return res.replace(/\s+/g, ' ').replace(/\s*-\s*/g, ' - ').trim();
}


