'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Globe, MapPin, Layers, Info } from 'lucide-react';

const CAUSE_COLORS: Record<string, string> = {
  vehicle_breakdown: '#3B82F6',
  accident: '#EF4444',
  public_event: '#8B5CF6',
  procession: '#EC4899',
  vip_movement: '#F59E0B',
  protest: '#DC2626',
  construction: '#F97316',
  congestion: '#14B8A6',
  water_logging: '#06B6D4',
  tree_fall: '#22C55E',
  pot_holes: '#84CC16',
  road_conditions: '#A8A29E',
  debris: '#6B7280',
  others: '#94A3B8',
};

const ALL_CAUSES_LIST = Object.keys(CAUSE_COLORS);

export default function HeatmapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterMarkersRef = useRef<any[]>([]);

  const [causes, setCauses] = useState<Record<string, number>>({});
  const [selectedCause, setSelectedCause] = useState<string>('all');
  const [showClusters, setShowClusters] = useState(true);
  const [showRaw, setShowRaw] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);

  // Load cause list + raw events
  useEffect(() => {
    Promise.all([
      api.getHotspots(),
      api.getEventsGeo(2000),
    ]).then(([hotspotRes, geoRes]) => {
      const h = hotspotRes as { causes: Record<string, number> };
      if (h.causes) setCauses(h.causes);
      setRawEvents(geoRes.events || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Load clusters when cause changes
  useEffect(() => {
    if (selectedCause === 'all') {
      setClusters([]);
      return;
    }
    api.getHotspots(selectedCause).then((res: any) => {
      setClusters(res.hotspots || []);
    }).catch(() => setClusters([]));
  }, [selectedCause]);

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    import('leaflet').then(L => {
      const map = L.map(mapRef.current!, {
        center: [12.97, 77.59],
        zoom: 11,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        opacity: 0.85,
      }).addTo(map);
      leafletRef.current = { map, L };
    });
    return () => {
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  // Update raw event dots
  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, L } = leafletRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (!showRaw) return;

    const filtered = selectedCause === 'all'
      ? rawEvents
      : rawEvents.filter(e => e.event_cause === selectedCause);

    filtered.slice(0, 1000).forEach(ev => {
      const color = CAUSE_COLORS[ev.event_cause] || '#94A3B8';
      const circle = L.circleMarker([ev.latitude, ev.longitude], {
        radius: 4,
        fillColor: color,
        color: 'rgba(0,0,0,0.2)',
        weight: 0.5,
        fillOpacity: 0.6,
      }).addTo(map);
      circle.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <p style="font-weight:600;font-size:12px;margin:0 0 4px">${ev.event_cause?.replace(/_/g,' ')}</p>
          <p style="font-size:11px;color:#666;margin:0">${ev.junction || 'Unknown junction'}</p>
          <p style="font-size:10px;color:#999;margin:4px 0 0">${ev.corridor || ''}</p>
        </div>
      `);
      markersRef.current.push(circle);
    });
  }, [rawEvents, selectedCause, showRaw]);

  // Update cluster markers
  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, L } = leafletRef.current;
    clusterMarkersRef.current.forEach(m => m.remove());
    clusterMarkersRef.current = [];
    if (!showClusters || clusters.length === 0) return;

    const color = CAUSE_COLORS[selectedCause] || '#E85D2A';
    clusters.forEach((cl: any) => {
      const radius = Math.max(12, Math.min(36, cl.size * 2));
      const m = L.circleMarker([cl.centroid_lat, cl.centroid_lon], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.85,
      }).addTo(map);
      m.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <p style="font-weight:700;font-size:13px;margin:0 0 4px">DBSCAN Cluster</p>
          <p style="font-size:11px;margin:0">Cause: <b>${selectedCause.replace(/_/g,' ')}</b></p>
          <p style="font-size:11px;margin:2px 0">Events in cluster: <b>${cl.size}</b></p>
          <p style="font-size:10px;color:#999;margin:4px 0 0">${cl.centroid_lat.toFixed(4)}, ${cl.centroid_lon.toFixed(4)}</p>
        </div>
      `);
      m.on('click', () => setSelectedCluster(cl));
      clusterMarkersRef.current.push(m);
    });
  }, [clusters, showClusters, selectedCause]);

  const totalEvents = selectedCause === 'all'
    ? rawEvents.length
    : rawEvents.filter(e => e.event_cause === selectedCause).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Historical Hotspot Map</h1>
        <p className="page-desc">ASTRAM event locations and DBSCAN spatial clusters across Bangalore — {rawEvents.length.toLocaleString()} events plotted</p>
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="input-label">Filter by Event Cause</label>
          <select className="select-field" value={selectedCause} onChange={e => setSelectedCause(e.target.value)}>
            <option value="all">All Causes ({rawEvents.length} events)</option>
            {ALL_CAUSES_LIST.filter(c => causes[c]).map(c => (
              <option key={c} value={c}>{c.replace(/_/g,' ')} ({causes[c] || 0} clusters)</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)}
              className="w-4 h-4 accent-primary-500" />
            <span className="text-sm text-ink-secondary dark:text-slate-300">Raw Events</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showClusters} onChange={e => setShowClusters(e.target.checked)}
              className="w-4 h-4 accent-primary-500" />
            <span className="text-sm text-ink-secondary dark:text-slate-300">DBSCAN Clusters</span>
          </label>
        </div>
        <div className="flex gap-3">
          <div className="bg-surface-subtle dark:bg-slate-900/60 rounded-xl px-4 py-2.5 border border-surface-border/40 dark:border-slate-800/60 text-center">
            <p className="text-lg font-bold text-ink dark:text-slate-100">{totalEvents.toLocaleString()}</p>
            <p className="text-[10px] text-ink-muted dark:text-slate-400">Events shown</p>
          </div>
          {selectedCause !== 'all' && (
            <div className="bg-surface-subtle dark:bg-slate-900/60 rounded-xl px-4 py-2.5 border border-surface-border/40 dark:border-slate-800/60 text-center">
              <p className="text-lg font-bold text-ink dark:text-slate-100">{clusters.length}</p>
              <p className="text-[10px] text-ink-muted dark:text-slate-400">Clusters</p>
            </div>
          )}
        </div>
      </div>

      {/* Map + Legend side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <div className="card !p-0 overflow-hidden rounded-card" style={{ height: '520px' }}>
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-card/80 dark:bg-slate-900/80">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>

        {/* Legend + Cluster Info */}
        <div className="space-y-4">
          <div className="card space-y-3">
            <p className="text-xs font-bold text-ink-muted dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={12} /> Cause Legend
            </p>
            <div className="space-y-1.5">
              {ALL_CAUSES_LIST.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCause(selectedCause === c ? 'all' : c)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedCause === c
                      ? 'bg-surface-hover dark:bg-slate-800 font-semibold'
                      : 'hover:bg-surface-subtle dark:hover:bg-slate-900/40'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAUSE_COLORS[c] }} />
                  <span className="text-ink-secondary dark:text-slate-300 truncate capitalize">{c.replace(/_/g,' ')}</span>
                  {causes[c] && <span className="ml-auto text-ink-muted dark:text-slate-500 text-[10px]">{causes[c]}</span>}
                </button>
              ))}
            </div>
          </div>

          {selectedCluster && (
            <div className="card space-y-2 border-primary-200 dark:border-primary-800/50 bg-primary-50/30 dark:bg-primary-950/20 animate-fade-in">
              <p className="text-xs font-bold text-primary-700 dark:text-primary-400 flex items-center gap-1.5">
                <MapPin size={12} /> Selected Cluster
              </p>
              <p className="text-sm font-semibold text-ink dark:text-slate-100">{selectedCluster.size} events</p>
              <p className="text-xs text-ink-secondary dark:text-slate-400 capitalize">{selectedCause.replace(/_/g,' ')}</p>
              <p className="text-[10px] text-ink-muted dark:text-slate-500">
                {selectedCluster.centroid_lat?.toFixed(5)}, {selectedCluster.centroid_lon?.toFixed(5)}
              </p>
              <button onClick={() => setSelectedCluster(null)} className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline">
                Clear
              </button>
            </div>
          )}

          <div className="card bg-surface-subtle dark:bg-slate-900/40 space-y-2">
            <p className="text-xs font-bold text-ink-muted dark:text-slate-400 flex items-center gap-1.5">
              <Info size={12} /> How to Read
            </p>
            <ul className="text-[11px] text-ink-muted dark:text-slate-500 space-y-1 list-disc list-inside leading-relaxed">
              <li>Small dots = individual ASTRAM events</li>
              <li>Large circles = DBSCAN cluster centroids</li>
              <li>Circle size = cluster event count</li>
              <li>Click any marker for details</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
