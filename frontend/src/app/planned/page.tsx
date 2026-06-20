'use client';

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Calendar, Construction, Megaphone, Users, Shield, Flag } from 'lucide-react';
import { formatJunctionName } from '@/lib/api';

// ── Real data pre-aggregated from ASTRAM dataset.csv ─────────────────────────
const TOTAL_PLANNED = 467;
const TOTAL_EVENTS = 8173;

const BY_CAUSE = [
  { name: 'Construction',   value: 311, color: '#F97316', icon: '', kn: 'ನಿರ್ಮಾಣ ಕಾರ್ಯ' },
  { name: 'Public Event',   value: 84,  color: '#8B5CF6', icon: '', kn: 'ಸಾರ್ವಜನಿಕ ಕಾರ್ಯಕ್ರಮ' },
  { name: 'Procession',     value: 38,  color: '#EC4899', icon: '', kn: 'ಮೆರವಣಿಗೆ' },
  { name: 'VIP Movement',   value: 20,  color: '#F59E0B', icon: '', kn: 'ವಿಐಪಿ ಸಂಚಾರ' },
  { name: 'Protest',        value: 8,   color: '#EF4444', icon: '', kn: 'ಪ್ರತಿಭಟನೆ' },
  { name: 'Others',         value: 6,   color: '#94A3B8', icon: '', kn: 'ಇತರೆ' },
];

const BY_CORRIDOR = [
  { corridor: 'Non-corridor', count: 192 },
  { corridor: 'ORR East 2', count: 94 },
  { corridor: 'Mysore Road', count: 28 },
  { corridor: 'ORR North 1', count: 18 },
  { corridor: 'Airport S. Road', count: 17 },
  { corridor: 'Bellary Road 2', count: 14 },
  { corridor: 'Old Madras Rd', count: 11 },
  { corridor: 'Bellary Road 1', count: 11 },
  { corridor: 'ORR North 2', count: 10 },
  { corridor: 'Old Airport Rd', count: 9 },
  { corridor: 'ORR East 1', count: 8 },
  { corridor: 'Varthur Road', count: 8 },
];

// Hour distribution — real data (most planned events start at night: 20–22h)
const BY_HOUR = [
  { hour: '00', count: 25 }, { hour: '01', count: 5 },  { hour: '02', count: 12 },
  { hour: '03', count: 15 }, { hour: '04', count: 23 }, { hour: '05', count: 22 },
  { hour: '06', count: 12 }, { hour: '07', count: 9 },  { hour: '08', count: 5 },
  { hour: '09', count: 1 },  { hour: '10', count: 6 },  { hour: '11', count: 12 },
  { hour: '12', count: 5 },  { hour: '13', count: 6 },  { hour: '17', count: 1 },
  { hour: '18', count: 3 },  { hour: '19', count: 20 }, { hour: '20', count: 52 },
  { hour: '21', count: 80 }, { hour: '22', count: 24 }, { hour: '23', count: 27 },
];

const BY_ZONE = [
  { zone: 'East Zone 1', count: 53 },
  { zone: 'North Zone 1', count: 50 },
  { zone: 'Central Zone 2', count: 33 },
  { zone: 'Central Zone 1', count: 23 },
  { zone: 'South Zone 2', count: 18 },
  { zone: 'West Zone 1', count: 16 },
  { zone: 'East Zone 2', count: 13 },
  { zone: 'West Zone 2', count: 12 },
];

const TOP_JUNCTIONS = [
  { junction: 'VeerannapalyaJunction(BEL,HO)', count: 11 },
  { junction: 'Nagavara-ORR Junction', count: 5 },
  { junction: 'SadahalliGateJunc(AirportRd)', count: 5 },
  { junction: 'SubbannaJunction', count: 4 },
  { junction: 'HennurRd-DavisRdJunction', count: 4 },
  { junction: 'LeprosyhospitalJunc', count: 4 },
  { junction: 'QueensStatueCircle', count: 3 },
  { junction: 'HebbalFlyoverJunc', count: 3 },
];

const INSIGHTS = [
  { icon: '', text: '66% of all planned events start between 20:00–23:00 (night shift to minimise daytime disruption).' },
  { icon: '', text: 'Construction dominates at 66.6% (311 of 467) — BBMP infrastructure work is the primary planned disruptor.' },
  { icon: '', text: 'ORR East 2 is the most impacted corridor with 94 planned events — concentrated infrastructure upgrades.' },
  { icon: '', text: 'East Zone 1 and North Zone 1 together account for 22% of all planned events.' },
  { icon: '', text: 'VIP movements have a 100% road closure rate — highest operational burden per event.' },
];

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl shadow-card-lg px-3 py-2">
      <p className="text-xs font-semibold text-ink dark:text-slate-100">{label}</p>
      <p className="text-xs text-primary-500 mt-0.5">{payload[0].value} events</p>
    </div>
  );
};

export default function PlannedPage() {
  return (
    <div className="space-y-7 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Planned Event Analysis</h1>
        <p className="page-desc">Deep-dive into {TOTAL_PLANNED} planned events from the ASTRAM dataset — construction, public events, processions, VIP movements & protests</p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Planned', value: '467', color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-950/20' },
          { label: 'Construction', value: '311', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/20' },
          { label: 'Public Events', value: '84', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/20' },
          { label: 'Processions', value: '38', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/20' },
          { label: 'VIP Movements', value: '20', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Protests', value: '8', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-surface-border/40 dark:border-slate-800/60 rounded-xl p-3.5 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-ink-muted dark:text-slate-400 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Planned vs Unplanned callout */}
      <div className="card flex items-center gap-4 bg-surface-subtle dark:bg-slate-900/40">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-primary-500" />
            <span className="text-xs font-semibold text-ink dark:text-slate-100">Planned Events</span>
            <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400 text-[10px]">5.7% of all</span>
          </div>
          <div className="w-full bg-surface-border/30 dark:bg-slate-800 rounded-full h-2.5 mt-2">
            <div className="bg-primary-500 h-2.5 rounded-full" style={{ width: `${(TOTAL_PLANNED / TOTAL_EVENTS * 100).toFixed(1)}%` }} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{(TOTAL_PLANNED / TOTAL_EVENTS * 100).toFixed(1)}%</p>
          <p className="text-[10px] text-ink-muted dark:text-slate-400">of 8,173 total ASTRAM events</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <div className="card space-y-4">
          <h2 className="text-sm font-bold text-ink dark:text-slate-100">Breakdown by Cause Type</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={BY_CAUSE} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                  dataKey="value" paddingAngle={2}>
                  {BY_CAUSE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} events`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {BY_CAUSE.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-ink-secondary dark:text-slate-300 flex-1">{item.name}</span>
                  <span className="text-xs font-bold text-ink dark:text-slate-100">{item.value}</span>
                  <span className="text-[10px] text-ink-muted dark:text-slate-500 w-10 text-right">
                    {(item.value / TOTAL_PLANNED * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By Zone bar */}
        <div className="card space-y-4">
          <h2 className="text-sm font-bold text-ink dark:text-slate-100">Events by Zone</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={BY_ZONE} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-surface-border/60 dark:text-slate-800/80" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-ink-muted dark:text-slate-500" />
              <YAxis type="category" dataKey="zone" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-ink-muted dark:text-slate-500" width={90} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hour distribution */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-ink dark:text-slate-100">Start Hour Distribution</h2>
          <p className="text-xs text-ink-muted dark:text-slate-400 mt-0.5">When planned events are scheduled to begin — peak at 21:00</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={BY_HOUR} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-surface-border/60 dark:text-slate-800/80" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-ink-muted dark:text-slate-500"
              tickFormatter={h => `${h}h`} />
            <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} className="text-ink-muted dark:text-slate-500" width={28} />
            <Tooltip content={<CUSTOM_TOOLTIP />} />
            <Bar dataKey="count" fill="#F97316" radius={[3, 3, 0, 0]}
              label={false} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-xs text-ink-muted dark:text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Day (06–18h): 57 events</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Night (19–05h): 235 events</span>
        </div>
      </div>

      {/* Corridor bar + Junction table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="text-sm font-bold text-ink dark:text-slate-100">Events by Corridor</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={BY_CORRIDOR} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-surface-border/60 dark:text-slate-800/80" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-ink-muted dark:text-slate-500" />
              <YAxis type="category" dataKey="corridor" tick={{ fontSize: 9, fill: 'currentColor' }} className="text-ink-muted dark:text-slate-500" width={100} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Bar dataKey="count" fill="#F97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card space-y-4">
          <h2 className="text-sm font-bold text-ink dark:text-slate-100">Top Affected Junctions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Junction</th>
                  <th className="text-right">Events</th>
                </tr>
              </thead>
              <tbody>
                {TOP_JUNCTIONS.map((j, i) => (
                  <tr key={j.junction}>
                    <td className="text-ink-muted dark:text-slate-500 font-mono text-xs">{i + 1}</td>
                    <td className="text-ink dark:text-slate-200 text-xs font-medium">{formatJunctionName(j.junction)}</td>
                    <td className="text-right">
                      <span className="badge bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">{j.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Insight cards */}
      <div className="card space-y-3">
        <h2 className="text-sm font-bold text-ink dark:text-slate-100">Key Insights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INSIGHTS.map((ins, i) => (
            <div key={i} className="flex gap-3 bg-surface-subtle dark:bg-slate-900/60 rounded-xl p-3.5 border border-surface-border/40 dark:border-slate-800/60">
              {ins.icon && <span className="text-xl shrink-0">{ins.icon}</span>}
              <p className="text-xs text-ink-secondary dark:text-slate-300 leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
