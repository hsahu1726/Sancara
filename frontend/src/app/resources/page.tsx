'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { ResourceResponse } from '@/types';
import { ClipboardList, Users, Cone, Radio, ArrowLeftRight, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const EVENT_CAUSES_LIST = [
  'vehicle_breakdown', 'water_logging', 'tree_fall', 'accident', 'construction',
  'public_event', 'procession', 'vip_movement', 'protest', 'pot_holes',
  'congestion', 'road_conditions', 'others'
];

const CORRIDORS_LIST = [
  'Non-corridor', 'Mysore Road', 'Bellary Road 1', 'Tumkur Road', 'ORR East 1',
  'ORR North 1', 'Hosur Road', 'Magadi Road', 'Old Madras Road', 'Bannerghata Road',
  'ORR East 2', 'ORR North 2', 'West of Chord Road', 'ORR West 1', 'CBD 2',
  'Hennur Main Road', 'Bellary Road 2', 'Varthur Road', 'Old Airport Road',
  'IRR(Thanisandra road)', 'Airport New South Road', 'CBD 1'
];

export default function ResourcesPage() {
  const [form, setForm] = useState({
    event_cause: 'vehicle_breakdown', priority: 'Low',
    corridor: 'Non-corridor', hour: 14, requires_road_closure: false,
  });
  const [result, setResult] = useState<ResourceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.getResources(form);
      setResult(r);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Resource Planning</h1>
        <p className="page-desc">Get data-driven resource recommendations for event management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ClipboardList size={16} className="text-primary-500" /> Event Details
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="input-label">Event Cause</label>
              <select className="select-field" value={form.event_cause}
                onChange={e => setForm(p => ({ ...p, event_cause: e.target.value }))}>
                {EVENT_CAUSES_LIST.map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
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
            <div>
              <label className="input-label">Corridor</label>
              <select className="select-field" value={form.corridor}
                onChange={e => setForm(p => ({ ...p, corridor: e.target.value }))}>
                {CORRIDORS_LIST.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Hour: {form.hour}:00</label>
              <input type="range" min={0} max={23} value={form.hour}
                onChange={e => setForm(p => ({ ...p, hour: Number(e.target.value) }))}
                className="range-input" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requires_road_closure}
                onChange={e => setForm(p => ({ ...p, requires_road_closure: e.target.checked }))}
                className="rounded border-surface-border text-primary-500 focus:ring-primary-200" />
              <span className="text-xs text-ink-secondary">Requires Road Closure</span>
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Computing...' : 'Get Recommendations'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {!result && !loading && (
            <div className="card h-full flex flex-col items-center justify-center min-h-[350px]">
              <ClipboardList size={44} className="mb-4 text-ink-muted/40" />
              <p className="text-sm text-ink-muted">Fill in the event details and click Get Recommendations</p>
            </div>
          )}
          {loading && (
            <div className="card h-full flex flex-col items-center justify-center min-h-[350px]">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {result && (
            <>
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${result.impact_label === 'Critical' ? 'badge-critical' :
                      result.impact_label === 'High' ? 'badge-high' :
                      result.impact_label === 'Medium' ? 'badge-medium' : 'badge-low'}`}>
                    {result.impact_label}
                  </span>
                  <span className="text-xs text-ink-muted">Impact Level</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <ResourceBox icon={Users} value={result.resources.officers} label="Officers" color="#3B82F6" />
                  <ResourceBox icon={Cone} value={result.resources.barricades} label="Barricades" color="#EA580C" />
                  <ResourceBox icon={Radio} value={result.resources.monitoring} label="Monitoring" color="#7C3AED" />
                  <ResourceBox icon={ArrowLeftRight} value={result.resources.diversion} label="Diversion" color="#059669" />
                </div>
                <p className="text-xs text-ink-muted mt-4">{result.resources.description}</p>
              </div>

              {/* Reference chart */}
              <div className="card">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 size={16} className="text-ink-muted" /> Resource Allocation Reference
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={result.reference_table}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
                    <XAxis dataKey="impact" tick={{ fill: '#A8A29E', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#A8A29E', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #E7E2DC', borderRadius: 10, color: '#1C1917', boxShadow: '0 4px 14px rgba(28,25,23,0.08)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#78716C' }} />
                    <Bar dataKey="officers" name="Officers" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="barricades" name="Barricades" fill="#EA580C" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="table-wrap">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th>Impact</th>
                        <th className="text-center">Officers</th>
                        <th className="text-center">Barricades</th>
                        <th className="text-center">Monitoring</th>
                        <th className="text-center">Diversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.reference_table.map((r, i) => (
                        <tr key={r.impact} className={i % 2 === 0 ? 'bg-surface-subtle/50' : ''}>
                          <td className="font-medium text-ink">{r.impact}</td>
                          <td className="text-center text-ink-secondary">{r.officers}</td>
                          <td className="text-center text-ink-secondary">{r.barricades}</td>
                          <td className="text-center text-ink-secondary">{r.monitoring}</td>
                          <td className="text-center text-ink-secondary">{r.diversion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card text-xs text-ink-muted leading-relaxed">
                <p className="font-medium text-ink-secondary mb-1">How resources are calculated:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Base resources determined by impact level (Low → 2 officers, Critical → 15+ officers)</li>
                  <li>Event cause modifiers adjust officer/barricade counts (e.g., public events +30%)</li>
                  <li>Peak hours (8-10 AM, 5-8 PM) increase requirements by 20%</li>
                  <li>Road closure increases barricade needs by 50%</li>
                  <li>Major corridors add 10% to resource requirements</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceBox({ icon: Icon, value, label, color }: any) {
  return (
    <div className="bg-surface-subtle rounded-xl p-4 text-center border border-surface-border/40">
      <Icon size={18} className="mx-auto mb-1.5" style={{ color }} />
      <p className="text-lg font-bold text-ink">{value}</p>
      <p className="text-[10px] text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}
