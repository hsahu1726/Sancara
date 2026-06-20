'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Sliders, Play, TrendingUp, TrendingDown, Minus, Zap, Clock, AlertTriangle } from 'lucide-react';

const ALL_CAUSES = [
  'vehicle_breakdown','accident','public_event','procession','vip_movement',
  'protest','construction','congestion','water_logging','tree_fall',
  'pot_holes','road_conditions','debris','others',
];
const ALL_CORRIDORS = [
  'Tumkur Road','ORR East 1','ORR East 2','ORR North 1','ORR North 2',
  'ORR West 1','Old Madras Road','Mysore Road','Hosur Road','Bellary Road 1',
  'Bellary Road 2','Bannerghata Road','Old Airport Road','Airport New South Road',
  'Varthur Road','Magadi Road','Hennur Main Road','West of Chord Road',
  'CBD 1','CBD 2','IRR(Thanisandra road)','Non-corridor',
];
const ALL_ZONES = [
  'Central Zone 1','Central Zone 2','North Zone 1','North Zone 2',
  'South Zone 1','South Zone 2','East Zone 1','East Zone 2',
  'West Zone 1','West Zone 2',
];

const PRESETS = [
  { label: 'Peak Hour Flood',         cause: 'water_logging',    corridor: 'ORR East 2',    hour: 9,  priority: 'High', closure: true  },
  { label: 'VIP on Bellary Road',      cause: 'vip_movement',     corridor: 'Bellary Road 1', hour: 11, priority: 'High', closure: true  },
  { label: 'Midnight Breakdown',       cause: 'vehicle_breakdown', corridor: 'Mysore Road',   hour: 1,  priority: 'Low',  closure: false },
  { label: 'Weekend Public Event',     cause: 'public_event',     corridor: 'Tumkur Road',   hour: 18, priority: 'High', closure: false },
  { label: 'Morning Procession',       cause: 'procession',       corridor: 'Old Madras Road',hour: 7,  priority: 'High', closure: true  },
  { label: 'CBD Accident',             cause: 'accident',         corridor: 'CBD 1',          hour: 17, priority: 'High', closure: true  },
];

const IMPACT_COLORS = ['#22c55e','#eab308','#f97316','#ef4444'];
const IMPACT_LABELS = ['Low','Medium','High','Critical'];
const IMPACT_BG = [
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
];

type ScenarioInput = {
  cause: string; corridor: string; zone: string;
  priority: string; hour: number; closure: boolean;
};

type PredResult = {
  impact_level: number; impact_label: string;
  resolution_minutes: number; cascade_probability: number;
};

function defaultInput(): ScenarioInput {
  return { cause: 'vehicle_breakdown', corridor: 'ORR East 1', zone: 'Central Zone 2', priority: 'Low', hour: 8, closure: false };
}

function ScenarioForm({ label, value, onChange, accent }: {
  label: string; value: ScenarioInput;
  onChange: (v: ScenarioInput) => void; accent: string;
}) {
  const set = (k: keyof ScenarioInput, v: any) => onChange({ ...value, [k]: v });
  return (
    <div className={`card space-y-4 border-l-4 ${accent}`}>
      <h3 className="text-sm font-bold text-ink dark:text-slate-100">{label}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="input-label">Event Cause</label>
          <select className="select-field" value={value.cause} onChange={e => set('cause', e.target.value)}>
            {ALL_CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Corridor</label>
          <select className="select-field" value={value.corridor} onChange={e => set('corridor', e.target.value)}>
            {ALL_CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Zone</label>
          <select className="select-field" value={value.zone} onChange={e => set('zone', e.target.value)}>
            {ALL_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Priority</label>
          <select className="select-field" value={value.priority} onChange={e => set('priority', e.target.value)}>
            <option value="Low">Low</option>
            <option value="High">High</option>
          </select>
        </div>
        <div>
          <label className="input-label">Hour of Day: {String(value.hour).padStart(2,'0')}:00</label>
          <input type="range" min={0} max={23} value={value.hour}
            onChange={e => set('hour', Number(e.target.value))} className="range-input w-full mt-2" />
          <div className="flex justify-between text-[10px] text-ink-muted dark:text-slate-500 mt-1">
            <span>00:00</span><span>12:00</span><span>23:00</span>
          </div>
        </div>
        <div>
          <label className="input-label">Road Closure</label>
          <select className="select-field" value={value.closure ? 'yes' : 'no'}
            onChange={e => set('closure', e.target.value === 'yes')}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: PredResult }) {
  const lvl = result.impact_level;
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className={`rounded-xl p-3 text-center ${IMPACT_BG[lvl]}`}>
        <p className="text-xl font-bold">{result.impact_label}</p>
        <p className="text-[10px] font-medium mt-0.5">Impact</p>
      </div>
      <div className="rounded-xl p-3 text-center bg-surface-subtle dark:bg-slate-900/60 border border-surface-border/40 dark:border-slate-800/60">
        <p className="text-xl font-bold text-ink dark:text-slate-100">{Math.round(result.resolution_minutes)}</p>
        <p className="text-[10px] text-ink-muted dark:text-slate-400 mt-0.5">Min to resolve</p>
      </div>
      <div className={`rounded-xl p-3 text-center ${result.cascade_probability > 50 ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'}`}>
        <p className="text-xl font-bold">{result.cascade_probability.toFixed(0)}%</p>
        <p className="text-[10px] font-medium mt-0.5">Cascade risk</p>
      </div>
    </div>
  );
}

function DeltaChip({ base, whatif, label, unit = '', lowerIsBetter = true }: {
  base: number; whatif: number; label: string; unit?: string; lowerIsBetter?: boolean;
}) {
  const diff = whatif - base;
  const pct = base > 0 ? ((Math.abs(diff) / base) * 100).toFixed(0) : '0';
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const color = diff === 0 ? 'text-ink-muted dark:text-slate-500' : improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const bg = diff === 0 ? 'bg-surface-subtle dark:bg-slate-900/60' : improved ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20';
  const Icon = diff === 0 ? Minus : improved ? TrendingDown : TrendingUp;
  return (
    <div className={`${bg} rounded-xl p-3 border border-surface-border/40 dark:border-slate-800/40`}>
      <p className="text-[10px] text-ink-muted dark:text-slate-500 font-medium mb-1">{label}</p>
      <div className={`flex items-center gap-1.5 ${color}`}>
        <Icon size={14} />
        <span className="text-sm font-bold">
          {diff > 0 ? '+' : ''}{diff !== 0 ? `${Math.round(Math.abs(diff))}${unit}` : 'No change'}
        </span>
        {diff !== 0 && <span className="text-[10px]">({pct}%)</span>}
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const [base, setBase] = useState<ScenarioInput>(defaultInput());
  const [whatif, setWhatif] = useState<ScenarioInput>({ ...defaultInput(), cause: 'accident', priority: 'High', closure: true });
  const [baseResult, setBaseResult] = useState<PredResult | null>(null);
  const [whatifResult, setWhatifResult] = useState<PredResult | null>(null);
  const [loading, setLoading] = useState(false);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setWhatif(prev => ({ ...prev, cause: preset.cause, corridor: preset.corridor, hour: preset.hour, priority: preset.priority, closure: preset.closure }));
    setBaseResult(null);
    setWhatifResult(null);
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const [br, wr] = await Promise.all([
        api.predict({ event_type: 'unplanned', event_cause: base.cause, corridor: base.corridor, zone: base.zone, priority: base.priority, requires_road_closure: base.closure, junction: 'unknown', hour: base.hour }),
        api.predict({ event_type: 'unplanned', event_cause: whatif.cause, corridor: whatif.corridor, zone: whatif.zone, priority: whatif.priority, requires_road_closure: whatif.closure, junction: 'unknown', hour: whatif.hour }),
      ]);
      setBaseResult(br as PredResult);
      setWhatifResult(wr as PredResult);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">What-If Scenario Simulator</h1>
        <p className="page-desc">Compare two event configurations side-by-side using the ASTRAM-trained ML model to see how changing cause, corridor, or time affects predicted severity</p>
      </div>

      {/* Presets */}
      <div className="card space-y-3">
        <p className="text-xs font-bold text-ink-muted dark:text-slate-400 uppercase tracking-wider">Quick Presets — Apply to What-If</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-surface-border dark:border-slate-700 bg-surface-card dark:bg-slate-900 text-ink-secondary dark:text-slate-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScenarioForm label="Base Scenario" value={base} onChange={setBase} accent="border-l-blue-400 dark:border-l-blue-600" />
        <ScenarioForm label="What-If Scenario" value={whatif} onChange={setWhatif} accent="border-l-orange-400 dark:border-l-orange-500" />
      </div>

      <div className="flex justify-center">
        <button onClick={runSimulation} disabled={loading} className="btn-primary px-8">
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play size={16} />}
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      {/* Results */}
      {baseResult && whatifResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Result cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card space-y-3 border-l-4 border-l-blue-400 dark:border-l-blue-600">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Base Result</p>
              <ResultCard result={baseResult} />
            </div>
            <div className="card space-y-3 border-l-4 border-l-orange-400 dark:border-l-orange-500">
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">What-If Result</p>
              <ResultCard result={whatifResult} />
            </div>
          </div>

          {/* Delta comparison */}
          <div className="card space-y-4">
            <h3 className="text-sm font-bold text-ink dark:text-slate-100 flex items-center gap-2">
              <Sliders size={16} className="text-primary-500" /> Impact Delta — Base vs What-If
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DeltaChip
                base={baseResult.impact_level} whatif={whatifResult.impact_level}
                label="Severity Level" lowerIsBetter={true}
              />
              <DeltaChip
                base={baseResult.resolution_minutes} whatif={whatifResult.resolution_minutes}
                label="Resolution Time" unit=" min" lowerIsBetter={true}
              />
              <DeltaChip
                base={baseResult.cascade_probability} whatif={whatifResult.cascade_probability}
                label="Cascade Probability" unit="%" lowerIsBetter={true}
              />
            </div>
            <div className="bg-surface-subtle dark:bg-slate-900/40 rounded-xl p-4 border border-surface-border/40 dark:border-slate-800/40">
              {whatifResult.impact_level > baseResult.impact_level ? (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle size={14} /> The What-If scenario is <strong>more severe</strong> — resolution takes {Math.round(whatifResult.resolution_minutes - baseResult.resolution_minutes)} minutes longer with {(whatifResult.cascade_probability - baseResult.cascade_probability).toFixed(0)}% higher cascade risk.
                </p>
              ) : whatifResult.impact_level < baseResult.impact_level ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Zap size={14} /> The What-If scenario is <strong>less severe</strong> — saves ~{Math.round(baseResult.resolution_minutes - whatifResult.resolution_minutes)} minutes resolution time with lower cascade risk.
                </p>
              ) : (
                <p className="text-sm text-ink-secondary dark:text-slate-400 flex items-center gap-2">
                  <Minus size={14} /> Both scenarios predict the same <strong>{baseResult.impact_label}</strong> impact level. Resolution time differs by {Math.abs(Math.round(whatifResult.resolution_minutes - baseResult.resolution_minutes))} minutes.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!baseResult && (
        <div className="card text-center py-16">
          <Sliders size={40} className="mx-auto mb-4 text-ink-muted/40 dark:text-slate-600" />
          <p className="text-sm text-ink-secondary dark:text-slate-400">Configure both scenarios above and click Run Simulation</p>
          <p className="text-xs text-ink-muted dark:text-slate-500 mt-1">Uses the ASTRAM-trained XGBoost model for predictions</p>
        </div>
      )}
    </div>
  );
}
