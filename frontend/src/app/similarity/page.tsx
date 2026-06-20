'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { SimilarEvent, SimilarityInput } from '@/types';
import { Search, ArrowRight, Clock, Shield } from 'lucide-react';

const EVENT_CAUSES = [
  'vehicle_breakdown', 'water_logging', 'tree_fall', 'accident', 'construction',
  'public_event', 'procession', 'vip_movement', 'protest', 'pot_holes', 'congestion', 'road_conditions', 'others'
];

const CORRIDORS = [
  'Non-corridor', 'Mysore Road', 'Bellary Road 1', 'Tumkur Road', 'ORR East 1',
  'ORR North 1', 'Hosur Road', 'Magadi Road', 'Old Madras Road', 'Bannerghata Road',
  'ORR East 2', 'ORR North 2', 'West of Chord Road', 'ORR West 1', 'CBD 2',
  'Hennur Main Road', 'Bellary Road 2', 'Varthur Road', 'Old Airport Road', 'IRR(Thanisandra road)'
];

const ZONES = [
  'Central Zone 2', 'West Zone 1', 'North Zone 2', 'West Zone 2', 'South Zone 2',
  'North Zone 1', 'Central Zone 1', 'East Zone 1', 'South Zone 1', 'East Zone 2'
];

export default function SimilarityPage() {
  const [form, setForm] = useState<SimilarityInput>({
    event_cause: 'vehicle_breakdown', corridor: 'Non-corridor',
    zone: 'Central Zone 2', junction: 'unknown',
    event_type: 'unplanned', priority: 'Low',
  });
  const [results, setResults] = useState<SimilarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.similarity(form);
      setResults(r.results);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Event Similarity Search</h1>
        <p className="page-desc">Find historical events similar to any event profile</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Search size={16} className="text-primary-500" /> Search Criteria
          </h3>
          <form onSubmit={handleSearch} className="space-y-3.5">
            <div>
              <label className="input-label">Event Cause</label>
              <select className="select-field" value={form.event_cause}
                onChange={e => setForm(p => ({ ...p, event_cause: e.target.value }))}>
                {EVENT_CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Corridor</label>
              <select className="select-field" value={form.corridor}
                onChange={e => setForm(p => ({ ...p, corridor: e.target.value }))}>
                {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Zone</label>
              <select className="select-field" value={form.zone}
                onChange={e => setForm(p => ({ ...p, zone: e.target.value }))}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Type</label>
                <select className="select-field" value={form.event_type}
                  onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))}>
                  <option value="unplanned">Unplanned</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
              <div>
                <label className="input-label">Priority</label>
                <select className="select-field" value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Searching...' : 'Find Similar Events'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowRight size={16} className="text-primary-500" />
            <h3 className="text-sm font-semibold">Results</h3>
            {results.length > 0 && <span className="text-xs text-ink-muted">({results.length} found)</span>}
          </div>
          {results.length === 0 && !loading && (
            <div className="card flex flex-col items-center justify-center h-64">
              <Search size={36} className="mb-3 text-ink-muted/40" />
              <p className="text-sm text-ink-muted">Set criteria and search for similar historical events</p>
            </div>
          )}
          {loading && (
            <div className="card flex flex-col items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {results.map((event, i) => (
            <SimilarEventCard key={event.event_id || i} event={event} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SimilarEventCard({ event, rank }: { event: SimilarEvent; rank: number }) {
  const impactStyles: Record<string, string> = {
    Low: 'badge-low',
    Medium: 'badge-medium',
    High: 'badge-high',
    Critical: 'badge-critical',
  };

  const simPct = (event.similarity_score * 100).toFixed(0);

  return (
    <div className="card-hover flex items-start gap-4 !p-4">
      <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink capitalize">{event.event_cause.replace(/_/g, ' ')}</span>
          <span className={`${impactStyles[event.impact_label] || 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded text-[10px] font-medium`}>
            {event.impact_label}
          </span>
        </div>
        <p className="text-xs text-ink-secondary mt-1">
          {event.corridor} · {event.zone} · {event.junction && event.junction !== 'unknown' ? event.junction : '—'}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-ink-muted">
          <span className="flex items-center gap-1"><Clock size={12} /> {event.resolution_minutes} min</span>
          <span className="flex items-center gap-1"><Shield size={12} /> {event.priority} priority</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-primary-500 tabular-nums">{simPct}%</p>
        <p className="text-[10px] text-ink-muted">similar</p>
      </div>
    </div>
  );
}
