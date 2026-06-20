'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Activity, Zap, AlertTriangle, MapPin, TrendingUp, Timer, LayoutList
} from 'lucide-react';

const IMPACT_COLORS = ['#059669', '#D97706', '#EA580C', '#DC2626'];
const CHART_COLORS = ['#E85D2A', '#3B82F6'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!stats) return <ErrorState />;

  const typeData = Object.entries(stats.event_type_distribution).map(([k, v]) => ({ name: k, value: v }));
  const impactData = Object.entries(stats.impact_distribution).map(([k, v]) => ({
    name: ['Low', 'Medium', 'High', 'Critical'][Number(k)] || k, value: v
  }));
  const causeData = Object.entries(stats.cause_distribution).map(([k, v]) => ({ name: k, value: v }));
  const tsData = Object.entries(stats.time_series).slice(-30).map(([k, v]) => ({ date: k.slice(5, 10), count: v }));

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Operational Dashboard</h1>
        <p className="page-desc">Real-time overview of traffic event intelligence</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          icon={Activity}
          value={stats.total_events.toLocaleString()}
          label="Total Events"
          color="primary"
        />
        <MetricCard
          icon={Zap}
          value={stats.active_events}
          label="Active Events"
          color="amber"
          delta={`${(stats.active_events / stats.total_events * 100).toFixed(1)}% of total`}
        />
        <MetricCard
          icon={AlertTriangle}
          value={stats.high_impact_events}
          label="High / Critical Impact"
          color="red"
          delta={`${(stats.high_impact_events / stats.total_events * 100).toFixed(1)}% of total`}
        />
        <MetricCard
          icon={MapPin}
          value={stats.top_junction}
          label="Most Vulnerable"
          color="violet"
          delta={`${stats.junctions_count} junctions`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Type */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Event Type Distribution</h3>
            <TrendingUp size={16} className="text-ink-muted" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                paddingAngle={4} dataKey="value" stroke="none">
                {typeData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % 2]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10, color: 'var(--tooltip-text)', boxShadow: '0 4px 14px rgba(28,25,23,0.08)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {typeData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % 2] }} />
                <span className="text-xs text-ink-secondary capitalize">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Impact Level */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Impact Level Distribution</h3>
            <LayoutList size={16} className="text-ink-muted" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={impactData}>
              <XAxis dataKey="name" tick={{ fill: '#A8A29E', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#A8A29E', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10, color: 'var(--tooltip-text)', boxShadow: '0 4px 14px rgba(28,25,23,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} stroke="none" maxBarSize={48}>
                {impactData.map((_, i) => (
                  <Cell key={i} fill={IMPACT_COLORS[i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Causes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Top Event Causes</h3>
            <Activity size={16} className="text-ink-muted" />
          </div>
          <div className="space-y-3">
            {causeData.slice(0, 7).reverse().map((d) => {
              const maxVal = causeData[0]?.value || 1;
              const pct = (d.value / maxVal) * 100;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-xs text-ink-secondary w-20 sm:w-28 truncate text-right capitalize">{d.name.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-2 bg-surface-border/60 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500 transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-ink-secondary w-10 text-right tabular-nums">{d.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Series */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Events Over Time</h3>
            <Timer size={16} className="text-ink-muted" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={tsData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E85D2A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E85D2A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#A8A29E', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#A8A29E', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10, color: 'var(--tooltip-text)', boxShadow: '0 4px 14px rgba(28,25,23,0.08)' }} />
              <Area type="monotone" dataKey="count" stroke="#E85D2A" strokeWidth={2} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Performance */}
      {stats.metrics && (stats.metrics.impact_accuracy || stats.metrics.cascade_accuracy) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Model Performance</h3>
            <Activity size={16} className="text-ink-muted" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricBadge label="Impact Accuracy" value={`${((stats.metrics.impact_accuracy || 0) * 100).toFixed(1)}%`} color="primary" />
            <MetricBadge label="Cascade Accuracy" value={`${((stats.metrics.cascade_accuracy || 0) * 100).toFixed(1)}%`} color="emerald" />
            <MetricBadge label="Resolution MAE" value={`${(stats.metrics.resolution_mae || 0).toFixed(0)} min`} color="amber" />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, value, label, color, delta }: any) {
  const borders: Record<string, string> = {
    primary: 'border-l-primary-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
    violet: 'border-l-violet-500',
  };
  const glows: Record<string, string> = {
    primary: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-primary-400',
    amber: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400',
    red: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-red-400',
    violet: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:border-violet-400',
  };
  const icons: Record<string, string> = {
    primary: 'text-primary-500 bg-primary-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10',
    violet: 'text-violet-500 bg-violet-500/10',
  };
  return (
    <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-card border border-surface-border border-opacity-60 dark:border-slate-800/60 border-l-4 ${borders[color] || borders.primary} p-5 shadow-card relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${glows[color] || glows.primary}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="metric-value text-2xl font-bold tracking-tight text-ink dark:text-slate-50">{value}</p>
          <p className="metric-label mt-1 text-xs font-medium text-ink-secondary dark:text-slate-400">{label}</p>
          {delta && <p className="text-[11px] text-ink-muted dark:text-slate-500 mt-1.5 font-medium">{delta}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${icons[color] || icons.primary}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function MetricBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    primary: 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-950/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20',
    amber: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20',
  };
  return (
    <div className="rounded-xl bg-surface-subtle dark:bg-slate-950/40 p-4 text-center border border-surface-border border-opacity-40 dark:border-slate-800/40">
      <p className={`text-2xl font-bold ${colors[color]?.split(' ')[0] || 'text-ink dark:text-slate-50'}`}>{value}</p>
      <p className="text-xs text-ink-secondary dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-7 animate-pulse">
      <div className="h-7 w-56 bg-surface-border/50 rounded-lg" />
      <div className="grid grid-cols-4 gap-5">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-surface-border/30 rounded-card" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[1, 2].map(i => <div key={i} className="h-80 bg-surface-border/30 rounded-card" />)}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="empty-state h-96">
      <AlertTriangle size={40} className="mb-4 text-ink-muted" />
      <p className="text-base font-medium text-ink-secondary">Failed to load dashboard</p>
      <p className="text-sm text-ink-muted mt-1">Make sure the API server is running on port 8000</p>
    </div>
  );
}
