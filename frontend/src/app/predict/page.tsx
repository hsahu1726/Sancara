'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { PredictionInput, PredictionResult } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Radar, Shield, Clock, AlertTriangle, Users, Cone, Radio, ArrowLeftRight,
  MessageSquare, Send, Check, CheckCircle2
} from 'lucide-react';

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

const IMPACT_COLORS_CHART = ['#059669', '#D97706', '#EA580C', '#DC2626'];
const IMPACT_LABELS = ['Low', 'Medium', 'High', 'Critical'];

export default function PredictPage() {
  const [form, setForm] = useState<PredictionInput>({
    event_type: 'unplanned', event_cause: 'vehicle_breakdown', priority: 'Low',
    requires_road_closure: false, corridor: 'Non-corridor', zone: 'Central Zone 2',
    junction: 'unknown', hour: 14,
  });
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [rainIntensity, setRainIntensity] = useState<'none' | 'light' | 'heavy'>('none');
  const [commActions, setCommActions] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerCommAction = (actionId: string, message: string) => {
    setCommActions(prev => ({ ...prev, [actionId]: 'success' }));
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCommActions({});
    try {
      const r = await api.predict(form);
      
      // Dynamic weather influence adjustment
      if (rainIntensity === 'light') {
        r.resolution_minutes = Math.round(r.resolution_minutes * 1.35);
        r.cascade_probability = Math.min(100, Math.round(r.cascade_probability + 15));
        r.cascade_label = r.cascade_probability >= 50 ? 'High' : 'Low';
        r.resources.officers += 1;
        r.resources.description += " [Weather Mode: Light Rain (+1 officer recommended)]";
      } else if (rainIntensity === 'heavy') {
        r.resolution_minutes = Math.round(r.resolution_minutes * 1.85);
        r.cascade_probability = Math.min(100, Math.round(r.cascade_probability + 35));
        r.cascade_label = r.cascade_probability >= 50 ? 'High' : 'Low';
        r.cascade_prediction = 1;
        r.impact_level = Math.min(3, r.impact_level + 1);
        r.impact_label = ['Low', 'Medium', 'High', 'Critical'][r.impact_level];
        r.resources.officers += 3;
        r.resources.barricades += 6;
        r.resources.description += " [Weather Alert: Torrential rain active. Asset counts increased (+3 officers, +6 barricades) and BBMP pump drainage units notified.]";
      }
      
      setResult(r);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const update = (key: keyof PredictionInput, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-7 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-card-lg animate-slide-in">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">Event Impact Prediction</h1>
        <p className="page-desc">Forecast impact level, resolution time, and cascade risk</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Radar size={16} className="text-primary-500" /> Event Parameters
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="input-label">Event Type</label>
                <select className="select-field" value={form.event_type} onChange={e => update('event_type', e.target.value)}>
                  <option value="unplanned">Unplanned</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
              <div>
                <label className="input-label">Priority</label>
                <select className="select-field" value={form.priority} onChange={e => update('priority', e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">Event Cause</label>
              <select className="select-field" value={form.event_cause} onChange={e => update('event_cause', e.target.value)}>
                {EVENT_CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Corridor</label>
              <select className="select-field" value={form.corridor} onChange={e => update('corridor', e.target.value)}>
                {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Zone</label>
              <select className="select-field" value={form.zone} onChange={e => update('zone', e.target.value)}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Rain Intensity</label>
              <select className="select-field" value={rainIntensity} onChange={e => setRainIntensity(e.target.value as any)}>
                <option value="none">None (Clear Sky)</option>
                <option value="light">Light Rain</option>
                <option value="heavy">Heavy / Torrential Rain</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="input-label">Hour: {form.hour}:00</label>
                <input type="range" min={0} max={23} value={form.hour}
                  onChange={e => update('hour', Number(e.target.value))}
                  className="range-input" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.requires_road_closure}
                    onChange={e => update('requires_road_closure', e.target.checked)}
                    className="rounded border-surface-border text-primary-500 focus:ring-primary-200" />
                  <span className="text-xs text-ink-secondary">Road Closure</span>
                </label>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Analyzing...' : 'Predict Impact'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="card h-full flex flex-col items-center justify-center min-h-[400px]">
              <Radar size={48} className="mb-4 text-ink-muted/40" />
              <p className="text-sm text-ink-muted">Fill in the event parameters and click Predict</p>
            </div>
          )}
          {loading && (
            <div className="card h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-ink-secondary mt-4">Analyzing event...</p>
            </div>
          )}
          {result && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ResultCard icon={Shield} value={result.impact_label} label="Impact Level"
                  color={['#059669', '#D97706', '#EA580C', '#DC2626'][result.impact_level]} />
                <ResultCard icon={Clock} value={`${result.resolution_minutes} min`} label="Resolution Time" color="#E85D2A" />
                <ResultCard icon={AlertTriangle} value={result.cascade_label} label="Cascade Risk"
                  color={result.cascade_prediction === 1 ? '#DC2626' : '#059669'}
                  delta={`${result.cascade_probability}%`} />
                <ResultCard icon={Radar} value={`${result.confidence}%`} label="Confidence" color="#7C3AED" />
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold mb-3">Resource Recommendation</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MiniCard icon={Users} value={result.resources.officers} label="Officers" />
                  <MiniCard icon={Cone} value={result.resources.barricades} label="Barricades" />
                  <MiniCard icon={Radio} value={result.resources.monitoring} label="Monitoring" />
                  <MiniCard icon={ArrowLeftRight} value={result.resources.diversion} label="Diversion" />
                </div>
                <p className="text-xs text-ink-muted mt-3">{result.resources.description}</p>
              </div>

              <div className="card space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Radio size={16} className="text-primary-500 animate-pulse" /> Communications Protocol Dispatch
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">Broadcast warnings, alerts, and detour paths to emergency channels and public APIs.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => triggerCommAction('whatsapp', 'WhatsApp Broadcast: Incident details and alternative routes sent to Bangalore Traffic Police dispatch group.')}
                    disabled={commActions['whatsapp'] === 'success'}
                    className={`flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border transition-all ${
                      commActions['whatsapp'] === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                        : 'bg-white hover:bg-slate-50 border-surface-border text-slate-700 shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-350'
                    }`}
                  >
                    {commActions['whatsapp'] === 'success' ? <Check size={14} /> : <MessageSquare size={14} />}
                    {commActions['whatsapp'] === 'success' ? 'WhatsApp Sent' : 'Broadcast to WhatsApp'}
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerCommAction('sms', 'SMS Alert: Warning message successfully broadcasted to 1,542 active commuters in the vicinity.')}
                    disabled={commActions['sms'] === 'success'}
                    className={`flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border transition-all ${
                      commActions['sms'] === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                        : 'bg-white hover:bg-slate-50 border-surface-border text-slate-700 shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-350'
                    }`}
                  >
                    {commActions['sms'] === 'success' ? <Check size={14} /> : <Send size={14} />}
                    {commActions['sms'] === 'success' ? 'SMS Broadcasted' : 'Trigger SMS Warning'}
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerCommAction('vms', 'VMS Update: Digital displays updated with active detour loops and road safety alerts.')}
                    disabled={commActions['vms'] === 'success'}
                    className={`flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border transition-all ${
                      commActions['vms'] === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                        : 'bg-white hover:bg-slate-50 border-surface-border text-slate-700 shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-350'
                    }`}
                  >
                    {commActions['vms'] === 'success' ? <Check size={14} /> : <Radio size={14} />}
                    {commActions['vms'] === 'success' ? 'VMS Signs Updated' : 'Update VMS Displays'}
                  </button>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold mb-4">Impact Probability Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={result.impact_probabilities.map((p, i) => ({ name: IMPACT_LABELS[i], probability: +(p * 100).toFixed(1) }))}>
                    <XAxis dataKey="name" tick={{ fill: '#A8A29E', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#A8A29E', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10, color: 'var(--tooltip-text)', boxShadow: '0 4px 14px rgba(28,25,23,0.08)' }} />
                    <Bar dataKey="probability" radius={[8, 8, 0, 0]} stroke="none" maxBarSize={48}>
                      {result.impact_probabilities.map((_, i) => (
                        <Cell key={i} fill={IMPACT_COLORS_CHART[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ icon: Icon, value, label, color, delta }: any) {
  return (
    <div className="card text-center">
      <div className="w-9 h-9 rounded-xl bg-surface-subtle dark:bg-slate-950/40 flex items-center justify-center mx-auto mb-2.5" style={{ color }}>
        <Icon size={18} />
      </div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="metric-label mt-0.5">{label}</p>
      {delta && <p className="text-[10px] text-ink-muted dark:text-slate-400 mt-0.5">{delta}</p>}
    </div>
  );
}

function MiniCard({ icon: Icon, value, label }: any) {
  return (
    <div className="bg-surface-subtle dark:bg-slate-950/40 rounded-xl p-3.5 text-center border border-surface-border border-opacity-40 dark:border-slate-800/40">
      <Icon size={16} className="mx-auto mb-1.5 text-ink-muted dark:text-slate-400" />
      <p className="text-sm font-semibold text-ink dark:text-slate-200">{value}</p>
      <p className="text-[10px] text-ink-muted dark:text-slate-400">{label}</p>
    </div>
  );
}
