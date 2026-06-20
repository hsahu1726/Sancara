'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Radio, Copy, Check, Volume2, RefreshCw } from 'lucide-react';

// ── Kannada Translation Maps ─────────────────────────────────────────────────
const CAUSE_KN: Record<string, string> = {
  vehicle_breakdown: 'ವಾಹನ ಕೆಟ್ಟುಹೋಗಿದೆ',
  accident: 'ಅಪಘಾತ',
  public_event: 'ಸಾರ್ವಜನಿಕ ಕಾರ್ಯಕ್ರಮ',
  procession: 'ಮೆರವಣಿಗೆ',
  vip_movement: 'ವಿಐಪಿ ಸಂಚಾರ',
  protest: 'ಪ್ರತಿಭಟನೆ',
  construction: 'ನಿರ್ಮಾಣ ಕಾರ್ಯ',
  congestion: 'ಸಂಚಾರ ದಟ್ಟಣೆ',
  water_logging: 'ನೀರು ನಿಲ್ಲುವಿಕೆ',
  tree_fall: 'ಮರ ಬಿದ್ದಿದೆ',
  pot_holes: 'ಗುಂಡಿಗಳು',
  road_conditions: 'ರಸ್ತೆ ಸ್ಥಿತಿ ಸರಿಯಿಲ್ಲ',
  debris: 'ಅವಶೇಷ / ತ್ಯಾಜ್ಯ',
  others: 'ಇತರೆ ಕಾರಣ',
};

const CORRIDOR_KN: Record<string, string> = {
  'Tumkur Road': 'ತುಮಕೂರು ರಸ್ತೆ',
  'ORR East 1': 'ಬಾಹ್ಯ ರಿಂಗ್ ರಸ್ತೆ ಪೂರ್ವ ೧',
  'ORR East 2': 'ಬಾಹ್ಯ ರಿಂಗ್ ರಸ್ತೆ ಪೂರ್ವ ೨',
  'ORR North 1': 'ಬಾಹ್ಯ ರಿಂಗ್ ರಸ್ತೆ ಉತ್ತರ ೧',
  'ORR North 2': 'ಬಾಹ್ಯ ರಿಂಗ್ ರಸ್ತೆ ಉತ್ತರ ೨',
  'ORR West 1': 'ಬಾಹ್ಯ ರಿಂಗ್ ರಸ್ತೆ ಪಶ್ಚಿಮ ೧',
  'Old Madras Road': 'ಹಳೆ ಮದ್ರಾಸ್ ರಸ್ತೆ',
  'Mysore Road': 'ಮೈಸೂರು ರಸ್ತೆ',
  'Hosur Road': 'ಹೊಸೂರು ರಸ್ತೆ',
  'Bellary Road 1': 'ಬಳ್ಳಾರಿ ರಸ್ತೆ ೧',
  'Bellary Road 2': 'ಬಳ್ಳಾರಿ ರಸ್ತೆ ೨',
  'Bannerghata Road': 'ಬನ್ನೇರುಘಟ್ಟ ರಸ್ತೆ',
  'Old Airport Road': 'ಹಳೆ ವಿಮಾನ ನಿಲ್ದಾಣ ರಸ್ತೆ',
  'Airport New South Road': 'ವಿಮಾನ ನಿಲ್ದಾಣ ಹೊಸ ದಕ್ಷಿಣ ರಸ್ತೆ',
  'Varthur Road': 'ವರ್ತೂರು ರಸ್ತೆ',
  'Magadi Road': 'ಮಗಡಿ ರಸ್ತೆ',
  'Hennur Main Road': 'ಹೆಣ್ಣೂರು ಮುಖ್ಯ ರಸ್ತೆ',
  'West of Chord Road': 'ಚಾರ್ಡ್ ರಸ್ತೆ ಪಶ್ಚಿಮ',
  'CBD 1': 'ಕೇಂದ್ರ ವ್ಯಾಪಾರ ವಲಯ ೧',
  'CBD 2': 'ಕೇಂದ್ರ ವ್ಯಾಪಾರ ವಲಯ ೨',
  'Non-corridor': 'ಮುಖ್ಯ ಕಾರಿಡಾರ್ ಅಲ್ಲ',
  'IRR(Thanisandra road)': 'ಥಾಣಿಸಂದ್ರ ರಸ್ತೆ',
};

const SEVERITY_KN: Record<string, string> = {
  Low: 'ಕಡಿಮೆ ತೀವ್ರತೆ',
  Medium: 'ಮಧ್ಯಮ ತೀವ್ರತೆ',
  High: 'ಹೆಚ್ಚಿನ ತೀವ್ರತೆ',
  Critical: 'ಅತ್ಯಂತ ಗಂಭೀರ',
};

const PRIORITY_KN: Record<string, string> = {
  High: 'ಅಧಿಕ ಆದ್ಯತೆ',
  Low: 'ಕಡಿಮೆ ಆದ್ಯತೆ',
};

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

function generateBroadcast(
  cause: string, corridor: string, priority: string,
  closure: boolean, severityLabel: string, resolutionMin: number, hour: number
): { kn: string; en: string } {
  const causeKn = CAUSE_KN[cause] || cause;
  const corridorKn = CORRIDOR_KN[corridor] || corridor;
  const sevKn = SEVERITY_KN[severityLabel] || severityLabel;
  const priKn = PRIORITY_KN[priority] || priority;
  const closureKn = closure ? 'ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ.' : 'ವಾಹನ ಸಂಚಾರ ನಿಧಾನವಾಗಿದೆ.';
  const timeKn = `ಅಂದಾಜು ${Math.round(resolutionMin)} ನಿಮಿಷಗಳಲ್ಲಿ ಸರಿಪಡಿಸಲಾಗುವುದು.`;
  const period = hour >= 5 && hour < 12 ? 'ಬೆಳಿಗ್ಗೆ' : hour >= 12 && hour < 17 ? 'ಮಧ್ಯಾಹ್ನ' : hour >= 17 && hour < 21 ? 'ಸಂಜೆ' : 'ರಾತ್ರಿ';

  const kn = `ಸಂಚಾರ ಸೂಚನೆ — ಬೆಂಗಳೂರು\n\n${period} ${corridorKn} ಮಾರ್ಗದಲ್ಲಿ ${causeKn} ಕಾರಣದಿಂದ ಸಂಚಾರ ಅಡಚಣೆ ಉಂಟಾಗಿದೆ. ${closureKn} ತೀವ್ರತೆ: ${sevKn} (${priKn}). ${timeKn} ಪ್ರಯಾಣಿಕರು ಪರ್ಯಾಯ ಮಾರ್ಗ ಬಳಸಬೇಕಾಗಿ ವಿನಂತಿ.\n\n— ಬೆಂಗಳೂರು ಸಂಚಾರ ಪೊಲೀಸ್ / ಬಿಬಿಎಂಪಿ`;

  const enClosure = closure ? 'Road closure in effect.' : 'Traffic is moving slowly.';
  const en = `Traffic Advisory — Bengaluru\n\nA ${cause.replace(/_/g, ' ')} has been reported on ${corridor}. ${enClosure} Severity: ${severityLabel} (${priority} Priority). Estimated resolution: ~${Math.round(resolutionMin)} minutes. Commuters are advised to use alternate routes.\n\n— Bengaluru Traffic Police / BBMP`;

  return { kn, en };
}

export default function BroadcastPage() {
  const [cause, setCause] = useState('vehicle_breakdown');
  const [corridor, setCorridor] = useState('ORR East 1');
  const [priority, setPriority] = useState('High');
  const [closure, setClosure] = useState(false);
  const [hour, setHour] = useState(8);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ kn: string; en: string; severity: string; resolution: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const pred = await api.predict({
        event_type: 'unplanned', event_cause: cause, corridor, priority,
        requires_road_closure: closure, zone: 'Central Zone 2',
        junction: 'unknown', hour,
      });
      const broadcast = generateBroadcast(
        cause, corridor, priority, closure,
        pred.impact_label, pred.resolution_minutes, hour
      );
      setResult({ ...broadcast, severity: pred.impact_label, resolution: pred.resolution_minutes });
    } catch {
      const broadcast = generateBroadcast(cause, corridor, priority, closure, 'High', 45, hour);
      setResult({ ...broadcast, severity: 'High', resolution: 45 });
    }
    setLoading(false);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">ಕನ್ನಡ Public Broadcast Generator</h1>
        <p className="page-desc">Generate Kannada-language traffic advisories for public announcements, SMS, and field broadcasts</p>
      </div>

      {/* Input form */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Radio size={16} className="text-primary-500" />
          <h2 className="text-sm font-semibold text-ink dark:text-slate-100">Event Parameters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="input-label">Event Cause (ಘಟನೆ ಕಾರಣ)</label>
            <select className="select-field" value={cause} onChange={e => setCause(e.target.value)}>
              {ALL_CAUSES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g,' ')} — {CAUSE_KN[c] || c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Corridor (ಕಾರಿಡಾರ್)</label>
            <select className="select-field" value={corridor} onChange={e => setCorridor(e.target.value)}>
              {ALL_CORRIDORS.map(c => (
                <option key={c} value={c}>{c} — {CORRIDOR_KN[c] || c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Priority (ಆದ್ಯತೆ)</label>
            <select className="select-field" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="High">High — ಅಧಿಕ</option>
              <option value="Low">Low — ಕಡಿಮೆ</option>
            </select>
          </div>
          <div>
            <label className="input-label">Hour of Day (ಗಂಟೆ)</label>
            <select className="select-field" value={hour} onChange={e => setHour(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2,'0')}:00 — {i < 12 ? 'ಬೆಳಿಗ್ಗೆ' : i < 17 ? 'ಮಧ್ಯಾಹ್ನ' : i < 21 ? 'ಸಂಜೆ' : 'ರಾತ್ರಿ'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Road Closure (ರಸ್ತೆ ಮುಚ್ಚಿದೆಯೇ?)</label>
            <select className="select-field" value={closure ? 'yes' : 'no'} onChange={e => setClosure(e.target.value === 'yes')}>
              <option value="no">No — ಇಲ್ಲ</option>
              <option value="yes">Yes — ಹೌದು</option>
            </select>
          </div>
        </div>

        <button onClick={generate} disabled={loading} className="btn-primary">
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Volume2 size={16} />}
          {loading ? 'Generating...' : 'Generate ಕನ್ನಡ Broadcast'}
        </button>
      </div>

      {/* Output */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Severity badge */}
          <div className="flex items-center gap-3">
            <span className={`badge text-sm px-3 py-1 font-semibold ${
              result.severity === 'Critical' ? 'badge-critical' :
              result.severity === 'High' ? 'badge-high' :
              result.severity === 'Medium' ? 'badge-medium' : 'badge-low'
            }`}>
              {SEVERITY_KN[result.severity]} ({result.severity})
            </span>
            <span className="text-xs text-ink-muted dark:text-slate-400">
              Predicted resolution: ~{Math.round(result.resolution)} min
            </span>
          </div>

          {/* Kannada broadcast */}
          <div className="card border-l-4 border-l-primary-500 dark:border-l-primary-400 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink dark:text-slate-100">ಕನ್ನಡ ಪ್ರಸಾರ</h3>
                <span className="badge bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 text-[10px]">Kannada</span>
              </div>
              <button
                onClick={() => copyText(result.kn)}
                className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-sm leading-relaxed text-ink dark:text-slate-100 font-sans whitespace-pre-wrap bg-surface-subtle dark:bg-slate-950/40 rounded-xl p-4 border border-surface-border/40 dark:border-slate-800/40">
              {result.kn}
            </pre>
          </div>

          {/* English translation */}
          <div className="card border-l-4 border-l-slate-400 dark:border-l-slate-600 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink dark:text-slate-100">English Translation</h3>
                <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-[10px]">Reference</span>
              </div>
              <button
                onClick={() => copyText(result.en)}
                className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <Copy size={14} />Copy
              </button>
            </div>
            <pre className="text-sm leading-relaxed text-ink-secondary dark:text-slate-300 font-sans whitespace-pre-wrap bg-surface-subtle dark:bg-slate-950/40 rounded-xl p-4 border border-surface-border/40 dark:border-slate-800/40">
              {result.en}
            </pre>
          </div>

          {/* Usage tips */}
          <div className="card bg-primary-50/50 dark:bg-primary-950/20 border-primary-100/60 dark:border-primary-900/40">
            <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-2">ಬಳಕೆ ಸಲಹೆಗಳು — Usage Tips</p>
            <ul className="text-xs text-ink-secondary dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>Copy ಕನ್ನಡ text to send as SMS to affected commuters</li>
              <li>Use for PA system announcements at junction control points</li>
              <li>Paste into WhatsApp broadcast for field officers</li>
              <li>Severity and resolution time are ML-predicted from ASTRAM data</li>
            </ul>
          </div>
        </div>
      )}

      {!result && (
        <div className="card text-center py-16">
          <Volume2 size={40} className="mx-auto mb-4 text-ink-muted/40 dark:text-slate-600" />
          <p className="text-sm text-ink-secondary dark:text-slate-400">Set event parameters above and click Generate</p>
          <p className="text-xs text-ink-muted dark:text-slate-500 mt-1">Advisory will appear in both ಕನ್ನಡ and English</p>
        </div>
      )}
    </div>
  );
}
