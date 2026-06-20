'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { Layers } from 'lucide-react';

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

  const [selectedCause, setSelectedCause] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [rawEvents, setRawEvents] = useState<any[]>([]);

  // Load raw events
  useEffect(() => {
    api.getEventsGeo(2000)
      .then((geoRes) => {
        setRawEvents(geoRes.events || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute cause counts dynamically from raw events
  const causeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rawEvents.forEach(ev => {
      if (ev.event_cause) {
        counts[ev.event_cause] = (counts[ev.event_cause] || 0) + 1;
      }
    });
    return counts;
  }, [rawEvents]);

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

  // Update raw event markers
  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, L } = leafletRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = selectedCause === 'all'
      ? rawEvents
      : rawEvents.filter(e => e.event_cause === selectedCause);

    filtered.slice(0, 1000).forEach(ev => {
      const color = CAUSE_COLORS[ev.event_cause] || '#94A3B8';
      const circle = L.circleMarker([ev.latitude, ev.longitude], {
        radius: 5,
        fillColor: color,
        color: 'rgba(0,0,0,0.2)',
        weight: 0.5,
        fillOpacity: 0.75,
      }).addTo(map);

      // Popup shows location/Junction/Corridor and then type of event (no descriptions, location text is larger)
      circle.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px;padding:2px">
          <p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#1e293b">${ev.junction || 'Unknown Junction'}${ev.corridor ? ` (${ev.corridor})` : ''}</p>
          <p style="font-weight:500;font-size:10.5px;color:#64748b;margin:0;text-transform:capitalize">${ev.event_cause?.replace(/_/g,' ')}</p>
        </div>
      `);
      markersRef.current.push(circle);
    });
  }, [rawEvents, selectedCause]);

  const totalEvents = selectedCause === 'all'
    ? rawEvents.length
    : rawEvents.filter(e => e.event_cause === selectedCause).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Historical Hotspot Map</h1>
        <p className="page-desc">ASTRAM event locations across Bangalore — {rawEvents.length.toLocaleString()} events plotted</p>
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap items-end justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="input-label">Filter by Event Cause</label>
          <select className="select-field" value={selectedCause} onChange={e => setSelectedCause(e.target.value)}>
            <option value="all">All Causes ({rawEvents.length} events)</option>
            {ALL_CAUSES_LIST.filter(c => causeCounts[c]).map(c => (
              <option key={c} value={c}>{c.replace(/_/g,' ')} ({causeCounts[c]} events)</option>
            ))}
          </select>
        </div>
        <div className="bg-surface-subtle dark:bg-slate-900/60 rounded-xl px-4 py-2.5 border border-surface-border/40 dark:border-slate-800/60 text-center">
          <p className="text-lg font-bold text-ink dark:text-slate-100">{totalEvents.toLocaleString()}</p>
          <p className="text-[10px] text-ink-muted dark:text-slate-400">Events shown</p>
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

        {/* Legend */}
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
                  {causeCounts[c] && <span className="ml-auto text-ink-muted dark:text-slate-500 text-[10px]">{causeCounts[c]}</span>}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
