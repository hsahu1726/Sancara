'use client';

import { useState, useMemo } from 'react';
import { CalendarDays, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ── Real day-level event counts from ASTRAM dataset ──────────────────────────
const RAW_COUNTS: Record<string, number> = {
  "2023-11-09":11,"2023-11-10":46,"2023-11-11":40,"2023-11-12":30,"2023-11-13":43,
  "2023-11-14":51,"2023-11-15":54,"2023-11-16":56,"2023-11-17":36,"2023-11-18":45,
  "2023-11-19":47,"2023-11-20":46,"2023-11-21":47,"2023-11-22":58,"2023-11-23":30,
  "2023-11-24":25,"2023-11-25":30,"2023-11-26":32,"2023-11-27":54,"2023-11-28":77,
  "2023-11-29":54,"2023-11-30":60,"2023-12-01":52,"2023-12-02":66,"2023-12-03":46,
  "2023-12-04":27,"2023-12-05":43,"2023-12-06":50,"2023-12-07":59,"2023-12-08":71,
  "2023-12-09":34,"2023-12-10":44,"2023-12-11":34,"2023-12-12":52,"2023-12-13":50,
  "2023-12-14":58,"2023-12-15":124,"2023-12-16":126,"2023-12-17":52,"2023-12-18":69,
  "2023-12-19":72,"2023-12-20":45,"2023-12-21":64,"2023-12-22":48,"2023-12-23":50,
  "2023-12-24":39,"2023-12-25":44,"2023-12-26":64,"2023-12-27":47,"2023-12-28":66,
  "2023-12-29":55,"2023-12-30":60,"2023-12-31":35,"2024-01-01":36,"2024-01-02":38,
  "2024-01-03":58,"2024-01-04":51,"2024-01-05":43,"2024-01-06":45,"2024-01-07":44,
  "2024-01-08":35,"2024-01-09":57,"2024-01-10":46,"2024-01-11":29,"2024-01-12":59,
  "2024-01-13":52,"2024-01-14":53,"2024-01-15":53,"2024-01-16":111,"2024-01-17":51,
  "2024-01-18":44,"2024-01-19":44,"2024-01-20":41,"2024-01-21":29,"2024-01-22":39,
  "2024-01-23":51,"2024-01-24":62,"2024-01-25":75,"2024-01-26":17,"2024-01-27":21,
  "2024-01-28":30,"2024-01-29":36,"2024-01-30":44,"2024-01-31":52,"2024-02-01":46,
  "2024-02-02":49,"2024-02-03":42,"2024-02-04":42,"2024-02-05":52,"2024-02-06":35,
  "2024-02-07":39,"2024-02-08":65,"2024-02-09":38,"2024-02-10":50,"2024-02-11":33,
  "2024-02-12":28,"2024-02-13":71,"2024-02-14":50,"2024-02-15":51,"2024-02-16":50,
  "2024-02-17":52,"2024-02-18":37,"2024-02-19":42,"2024-02-20":47,"2024-02-21":54,
  "2024-02-22":64,"2024-02-23":38,"2024-02-24":44,"2024-02-25":50,"2024-02-26":28,
  "2024-02-27":50,"2024-02-28":56,"2024-02-29":37,"2024-03-01":36,"2024-03-02":44,
  "2024-03-03":34,"2024-03-04":38,"2024-03-05":50,"2024-03-06":58,"2024-03-07":250,
  "2024-03-08":66,"2024-03-09":75,"2024-03-10":44,"2024-03-11":73,"2024-03-12":49,
  "2024-03-13":68,"2024-03-14":58,"2024-03-15":67,"2024-03-16":45,"2024-03-17":35,
  "2024-03-18":34,"2024-03-19":51,"2024-03-20":41,"2024-03-21":51,"2024-03-22":38,
  "2024-03-23":41,"2024-03-24":44,"2024-03-25":41,"2024-03-26":124,"2024-03-27":45,
  "2024-03-28":69,"2024-03-29":134,"2024-03-30":79,"2024-03-31":49,"2024-04-01":41,
  "2024-04-02":61,"2024-04-03":124,"2024-04-04":49,"2024-04-05":109,"2024-04-06":141,
  "2024-04-07":81,"2024-04-08":16,
};

const MONTHS = [
  { key: '2023-11', label: 'November 2023', days: 30 },
  { key: '2023-12', label: 'December 2023', days: 31 },
  { key: '2024-01', label: 'January 2024',  days: 31 },
  { key: '2024-02', label: 'February 2024', days: 29 },
  { key: '2024-03', label: 'March 2024',    days: 31 },
  { key: '2024-04', label: 'April 2024',    days: 8  },
];

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const allValues = Object.values(RAW_COUNTS);
const maxCount = Math.max(...allValues);

function getColor(count: number): string {
  if (count === 0) return 'bg-surface-subtle dark:bg-slate-800/60';
  const ratio = count / maxCount;
  if (ratio < 0.2) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300';
  if (ratio < 0.4) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
  if (ratio < 0.6) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300';
  if (ratio < 0.80) return 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300';
  return 'bg-red-500 dark:bg-red-600 text-white';
}

function getRiskLabel(count: number): string {
  const ratio = count / maxCount;
  if (ratio < 0.2) return 'Low';
  if (ratio < 0.4) return 'Moderate';
  if (ratio < 0.6) return 'Elevated';
  if (ratio < 0.8) return 'High';
  return 'Critical';
}

export default function CalendarPage() {
  const [monthIdx, setMonthIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const month = MONTHS[monthIdx];

  const calGrid = useMemo(() => {
    const firstDay = new Date(`${month.key}-01`).getDay(); // 0=Sun
    const cells: Array<{ date: string | null; count: number }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ date: null, count: 0 });
    for (let d = 1; d <= month.days; d++) {
      const date = `${month.key}-${String(d).padStart(2, '0')}`;
      cells.push({ date, count: RAW_COUNTS[date] || 0 });
    }
    return cells;
  }, [month]);

  // Overall stats
  const totalEvents = allValues.reduce((a, b) => a + b, 0);
  const totalDays = Object.keys(RAW_COUNTS).length;
  const avgPerDay = (totalEvents / totalDays).toFixed(1);
  const busiestDay = Object.entries(RAW_COUNTS).sort((a, b) => b[1] - a[1])[0];
  const quietestDay = Object.entries(RAW_COUNTS).sort((a, b) => a[1] - b[1])[0];
  const highDays = Object.values(RAW_COUNTS).filter(v => v >= 100).length;

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Historical Risk Calendar</h1>
        <p className="page-desc">Day-by-day event intensity across the ASTRAM dataset (Nov 2023 – Apr 2024) — {totalDays} days, {totalEvents.toLocaleString()} events</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: totalEvents.toLocaleString(), color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Avg / Day', value: avgPerDay, color: 'text-ink dark:text-slate-100' },
          { label: 'Peak Day', value: busiestDay[1], sub: busiestDay[0], color: 'text-red-600 dark:text-red-400' },
          { label: 'Days ≥ 100 Events', value: highDays, color: 'text-orange-600 dark:text-orange-400' },
        ].map(s => (
          <div key={s.label} className="bg-surface-subtle dark:bg-slate-900/60 border border-surface-border/40 dark:border-slate-800/60 rounded-xl p-3.5 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-ink-muted dark:text-slate-400 font-medium mt-0.5">{s.label}</p>
            {s.sub && <p className="text-[9px] text-ink-muted dark:text-slate-500 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card space-y-4">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => setMonthIdx(i => Math.max(0, i - 1))} disabled={monthIdx === 0}
            className="p-2 rounded-lg border border-surface-border dark:border-slate-700 hover:bg-surface-hover dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
            <ChevronLeft size={16} className="text-ink-secondary dark:text-slate-400" />
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold text-ink dark:text-slate-100">{month.label}</h2>
            <p className="text-xs text-ink-muted dark:text-slate-500">{month.days} days</p>
          </div>
          <button onClick={() => setMonthIdx(i => Math.min(MONTHS.length - 1, i + 1))} disabled={monthIdx === MONTHS.length - 1}
            className="p-2 rounded-lg border border-surface-border dark:border-slate-700 hover:bg-surface-hover dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
            <ChevronRight size={16} className="text-ink-secondary dark:text-slate-400" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-ink-muted dark:text-slate-500 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calGrid.map((cell, i) => (
            <button
              key={i}
              disabled={!cell.date}
              onClick={() => cell.date && setSelected(cell.date === selected ? null : cell.date)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold transition-all duration-150 relative
                ${!cell.date ? 'invisible' : ''}
                ${cell.date ? getColor(cell.count) : ''}
                ${cell.date === selected ? 'ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-slate-900 scale-110 z-10' : ''}
                ${cell.date && cell.count > 0 ? 'cursor-pointer hover:scale-105 hover:z-10' : 'cursor-default'}
              `}
              title={cell.date ? `${cell.date}: ${cell.count} events` : ''}
            >
              {cell.date && (
                <>
                  <span className="text-[9px] opacity-70">{new Date(cell.date + 'T00:00:00').getDate()}</span>
                  {cell.count > 0 && <span className="font-bold text-[10px] leading-none">{cell.count}</span>}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-surface-border/40 dark:border-slate-800/40">
          <span className="text-[10px] text-ink-muted dark:text-slate-500">Event intensity:</span>
          {[
            { label: 'Low', cls: 'bg-emerald-100 dark:bg-emerald-900/40' },
            { label: 'Moderate', cls: 'bg-yellow-100 dark:bg-yellow-900/40' },
            { label: 'Elevated', cls: 'bg-orange-100 dark:bg-orange-900/40' },
            { label: 'High', cls: 'bg-red-200 dark:bg-red-900/50' },
            { label: 'Critical', cls: 'bg-red-500 dark:bg-red-600' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${l.cls}`} />
              <span className="text-[10px] text-ink-muted dark:text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="card border-primary-200 dark:border-primary-800/50 bg-primary-50/30 dark:bg-primary-950/10 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-primary-500" />
              <h3 className="text-sm font-bold text-ink dark:text-slate-100">{selected}</h3>
              <span className={`badge text-[10px] ${
                getRiskLabel(RAW_COUNTS[selected] || 0) === 'Critical' ? 'badge-critical' :
                getRiskLabel(RAW_COUNTS[selected] || 0) === 'High' ? 'badge-high' :
                getRiskLabel(RAW_COUNTS[selected] || 0) === 'Elevated' ? 'badge-medium' : 'badge-low'
              }`}>
                {getRiskLabel(RAW_COUNTS[selected] || 0)} Risk Day
              </span>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-surface-hover dark:hover:bg-slate-800">
              <X size={14} className="text-ink-muted dark:text-slate-500" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-subtle dark:bg-slate-900/60 rounded-xl p-3 text-center border border-surface-border/40 dark:border-slate-800/60">
              <p className="text-2xl font-bold text-ink dark:text-slate-100">{RAW_COUNTS[selected] || 0}</p>
              <p className="text-[10px] text-ink-muted dark:text-slate-400">Total Events</p>
            </div>
            <div className="bg-surface-subtle dark:bg-slate-900/60 rounded-xl p-3 text-center border border-surface-border/40 dark:border-slate-800/60">
              <p className="text-2xl font-bold text-ink dark:text-slate-100">
                {((RAW_COUNTS[selected] || 0) / parseFloat(avgPerDay) * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-ink-muted dark:text-slate-400">vs Daily Average</p>
            </div>
            <div className="bg-surface-subtle dark:bg-slate-900/60 rounded-xl p-3 text-center border border-surface-border/40 dark:border-slate-800/60">
              <p className="text-2xl font-bold text-ink dark:text-slate-100">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(selected + 'T00:00:00').getDay()]}
              </p>
              <p className="text-[10px] text-ink-muted dark:text-slate-400">Day of Week</p>
            </div>
          </div>
          {(RAW_COUNTS[selected] || 0) === 250 && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 rounded-xl p-3 border border-red-100 dark:border-red-900/40">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">⚠️ Dataset anomaly: 2024-03-07 has 250 records — likely a bulk data migration or system backfill event.</p>
            </div>
          )}
        </div>
      )}

      {/* Month-over-month summary */}
      <div className="card space-y-4">
        <h2 className="text-sm font-bold text-ink dark:text-slate-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary-500" /> Monthly Summary
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MONTHS.map((m, idx) => {
            const monthEvents = Object.entries(RAW_COUNTS)
              .filter(([k]) => k.startsWith(m.key))
              .reduce((s, [, v]) => s + v, 0);
            const isActive = idx === monthIdx;
            return (
              <button
                key={m.key}
                onClick={() => setMonthIdx(idx)}
                className={`rounded-xl p-3 text-center border transition-all ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-950/20 border-primary-300 dark:border-primary-700/50'
                    : 'bg-surface-subtle dark:bg-slate-900/40 border-surface-border/40 dark:border-slate-800/60 hover:border-surface-border dark:hover:border-slate-700'
                }`}
              >
                <p className={`text-lg font-bold ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-ink dark:text-slate-100'}`}>
                  {monthEvents}
                </p>
                <p className="text-[9px] text-ink-muted dark:text-slate-500 mt-0.5">
                  {m.label.split(' ')[0].slice(0, 3)} {m.label.split(' ')[1].slice(2)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
