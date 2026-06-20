'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MapPin, Layers } from 'lucide-react';

const CAUSE_COLORS = [
  '#E85D2A', '#3B82F6', '#059669', '#DC2626', '#7C3AED',
  '#EC4899', '#14B8A6', '#D97706', '#6366F1', '#84CC16', '#06B6D4'
];

export default function HotspotsPage() {
  const [causes, setCauses] = useState<Record<string, number>>({});
  const [selectedCause, setSelectedCause] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHotspots().then((res) => {
      const d = res as { causes: Record<string, number> };
      setCauses(d.causes);
      const keys = Object.keys(d.causes);
      if (keys.length > 0) setSelectedCause(keys[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingHotspots />;

  const causeList = Object.entries(causes).sort((a, b) => b[1] - a[1]);
  const totalClusters = causeList.reduce((acc, [, v]) => acc + v, 0);

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Hotspot Analysis</h1>
        <p className="page-desc">Spatial clustering of events by cause type</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cause list */}
        <div className="lg:col-span-1 space-y-2">
          {causeList.map(([cause, count], i) => (
            <button
              key={cause}
              onClick={() => setSelectedCause(cause)}
              className={`w-full card-hover flex items-center gap-3 !p-3.5 text-left
                ${selectedCause === cause ? 'ring-1 ring-primary-500/40 bg-primary-50/50' : ''}`}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: CAUSE_COLORS[i % CAUSE_COLORS.length] }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate capitalize">{cause.replace(/_/g, ' ')}</p>
                <p className="text-xs text-ink-muted">{count} cluster{count > 1 ? 's' : ''}</p>
              </div>
              <span className="text-xs font-semibold text-ink-muted tabular-nums">{count}</span>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-primary-500" />
              {selectedCause ? selectedCause.replace(/_/g, ' ') : 'Select a cause'} — Hotspot Clusters
            </h3>
            {!selectedCause ? (
              <div className="empty-state h-48">
                <Layers size={36} className="mb-3 text-ink-muted/40" />
                <p className="text-sm text-ink-muted">Select an event cause to view hotspots</p>
              </div>
            ) : (
              <div className="bg-surface-subtle rounded-xl p-8 text-center border border-surface-border/40">
                <div className="text-5xl font-bold text-primary-500 mb-2">{causes[selectedCause]}</div>
                <p className="text-sm text-ink-secondary">hotspot clusters detected</p>
                <p className="text-xs text-ink-muted mt-6 leading-relaxed max-w-md mx-auto">
                  These clusters represent recurring spatial patterns where
                  <span className="text-ink font-medium capitalize"> {selectedCause.replace(/_/g, ' ')} </span>
                  events frequently occur. Each cluster groups nearby events using DBSCAN density-based clustering.
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold mb-4">Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryBox value={causeList.length} label="Event Causes" />
              <SummaryBox value={totalClusters} label="Total Clusters" />
              <SummaryBox value={causeList[0]?.[1] || 0} label="Most Clusters" sub={causeList[0]?.[0]?.replace(/_/g, ' ') || ''} />
              <SummaryBox value="11" label="Algorithm" sub="DBSCAN (eps=0.008)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ value, label, sub }: { value: number | string; label: string; sub?: string }) {
  return (
    <div className="bg-surface-subtle rounded-xl p-4 text-center border border-surface-border/40">
      <p className="text-xl font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-secondary mt-1">{label}</p>
      {sub && <p className="text-[10px] text-ink-muted mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function LoadingHotspots() {
  return (
    <div className="space-y-7 animate-pulse">
      <div className="h-7 w-48 bg-surface-border/50 rounded-lg" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-surface-border/30 rounded-lg" />)}
        </div>
        <div className="col-span-2 h-80 bg-surface-border/30 rounded-card" />
      </div>
    </div>
  );
}
