'use client';

import { useState } from 'react';
import { Map, Clock, Navigation, CheckCircle2, AlertCircle, Send, Check } from 'lucide-react';

interface DiversionRoute {
  id: string;
  name: string;
  congestedPoint: string;
  distance: string;
  normalTime: string;
  delayTime: string;
  savingsTime: string;
  severity: 'high' | 'medium' | 'critical';
  trafficLevel: 'light' | 'moderate' | 'heavy';
  steps: string[];
  alternativeName: string;
  congestedCenter: [number, number];
  congestedRoute: [number, number][];
  diversionRoute: [number, number][];
}

const DIVERSIONS: DiversionRoute[] = [
  {
    id: 'bellary-road',
    name: 'Bellary Road (Hebbal Flyover)',
    alternativeName: 'Thanisandra - Hennur Link Bypass',
    congestedPoint: 'Hebbal Flyover Outer Lane',
    distance: '4.8 km',
    normalTime: '12 mins',
    delayTime: '34 mins',
    savingsTime: '15 mins',
    severity: 'critical',
    trafficLevel: 'moderate',
    congestedCenter: [13.0358, 77.5970],
    congestedRoute: [
      [13.0250, 77.5920],
      [13.0358, 77.5970],
      [13.0450, 77.6000]
    ],
    diversionRoute: [
      [13.0250, 77.5920],
      [13.0300, 77.6080],
      [13.0480, 77.6150],
      [13.0550, 77.6060],
      [13.0450, 77.6000]
    ],
    steps: [
      'Divert traffic at Hebbal Outer Ring Road exit lane.',
      'Route vehicles onto Thanisandra Main Road.',
      'Take the right fork onto Hennur Main Road link bypass.',
      'Proceed through Bhartiya City roundabout and re-enter Airport Corridor.'
    ]
  },
  {
    id: 'mysore-road',
    name: 'Mysore Road (Gudadahalli)',
    alternativeName: 'Chord Road - Magadi Link',
    congestedPoint: 'Gudadahalli Underpass Junction',
    distance: '3.6 km',
    normalTime: '9 mins',
    delayTime: '27 mins',
    savingsTime: '11 mins',
    severity: 'high',
    trafficLevel: 'light',
    congestedCenter: [12.9535, 77.5420],
    congestedRoute: [
      [12.9450, 77.5500],
      [12.9535, 77.5420],
      [12.9600, 77.5320]
    ],
    diversionRoute: [
      [12.9450, 77.5500],
      [12.9550, 77.5300],
      [12.9650, 77.5250],
      [12.9700, 77.5350],
      [12.9600, 77.5320]
    ],
    steps: [
      'Exit Mysore Road at Gudadahalli exit ramp.',
      'Follow West of Chord Road northbound.',
      'Turn right onto Magadi Main Road.',
      'Use the Outer Ring Road connector to rejoin Mysore Road.'
    ]
  },
  {
    id: 'hosur-road',
    name: 'Hosur Road (Silk Board)',
    alternativeName: 'HSR Layout 27th Main Route',
    congestedPoint: 'Central Silk Board Flyover Entry',
    distance: '5.2 km',
    normalTime: '15 mins',
    delayTime: '48 mins',
    savingsTime: '21 mins',
    severity: 'critical',
    trafficLevel: 'heavy',
    congestedCenter: [12.9176, 77.6226],
    congestedRoute: [
      [12.9050, 77.6240],
      [12.9176, 77.6226],
      [12.9280, 77.6220]
    ],
    diversionRoute: [
      [12.9050, 77.6240],
      [12.9080, 77.6380],
      [12.9220, 77.6350],
      [12.9280, 77.6220]
    ],
    steps: [
      'Divert vehicles at Bommanahalli traffic junction.',
      'Route traffic through HSR Layout Sector 3 (27th Main Rd).',
      'Follow the service road parallel to Outer Ring Road.',
      'Rejoin Hosur Main Road past the Silk Board bottleneck.'
    ]
  },
  {
    id: 'old-madras-road',
    name: 'Old Madras Road (Indiranagar)',
    alternativeName: 'CV Raman Nagar Loop',
    congestedPoint: 'Indiranagar 100ft Road Intersection',
    distance: '2.9 km',
    normalTime: '7 mins',
    delayTime: '20 mins',
    savingsTime: '8 mins',
    severity: 'medium',
    trafficLevel: 'light',
    congestedCenter: [12.9784, 77.6408],
    congestedRoute: [
      [12.9780, 77.6300],
      [12.9784, 77.6408],
      [12.9788, 77.6520]
    ],
    diversionRoute: [
      [12.9780, 77.6300],
      [12.9900, 77.6350],
      [12.9920, 77.6500],
      [12.9788, 77.6520]
    ],
    steps: [
      'Exit Old Madras Road before the metro station.',
      'Divert vehicles through CV Raman Nagar main boulevard.',
      'Follow Kaggadasapura road link.',
      'Re-enter Old Madras Road past the Indiranagar bottleneck.'
    ]
  }
];

export default function CorridorsPage() {
  const [selectedId, setSelectedId] = useState(DIVERSIONS[0].id);
  const [activeActions, setActiveActions] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selected = DIVERSIONS.find(d => d.id === selectedId) || DIVERSIONS[0];

  const triggerAction = (actionId: string, message: string) => {
    setActiveActions(prev => ({ ...prev, [actionId]: 'success' }));
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const severityColors = {
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const trafficColors = {
    light: 'text-emerald-500 bg-emerald-500/10',
    moderate: 'text-amber-500 bg-amber-500/10',
    heavy: 'text-red-500 bg-red-500/10',
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0b0f19; }
        
        /* Modern styled-popup for Leaflet */
        .leaflet-popup-content-wrapper {
          background: #0f172a !important;
          color: #f8fafc !important;
          border: 1px solid #334155 !important;
          border-radius: 12px !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-popup-tip {
          background: #0f172a !important;
          border: 1px solid #334155 !important;
        }
        .leaflet-popup-content {
          margin: 12px 16px !important;
          font-size: 12px !important;
          line-height: 1.5 !important;
        }
        .popup-title {
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        .popup-desc {
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { 
          zoomControl: false,
          attributionControl: false 
        }).setView(${JSON.stringify(selected.congestedCenter)}, 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Congested Route (Red line)
        const congested = L.polyline(${JSON.stringify(selected.congestedRoute)}, {
          color: '#ef4444',
          weight: 5,
          opacity: 0.85
        }).addTo(map);

        // Diversion Route (Dashed Green line)
        const diversion = L.polyline(${JSON.stringify(selected.diversionRoute)}, {
          color: '#10b981',
          weight: 5,
          opacity: 0.95,
          dashArray: '8, 8'
        }).addTo(map);

        // Red bottleneck dot
        const bottleneckMarker = L.circleMarker(${JSON.stringify(selected.congestedCenter)}, {
          radius: 9,
          fillColor: '#ef4444',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);

        bottleneckMarker.bindPopup('<div class="popup-title">Bottleneck Point</div><div class="popup-desc">${selected.congestedPoint}</div>').openPopup();

        // entry/exit node indicators
        L.circleMarker(${JSON.stringify(selected.congestedRoute[0])}, {
          radius: 6,
          fillColor: '#3b82f6',
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map).bindPopup("<strong>Entry point:</strong> Detour starts here.");

        L.circleMarker(${JSON.stringify(selected.congestedRoute[selected.congestedRoute.length - 1])}, {
          radius: 6,
          fillColor: '#3b82f6',
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map).bindPopup("<strong>Exit point:</strong> Detour ends here.");

        const bounds = L.latLngBounds([...${JSON.stringify(selected.congestedRoute)}, ...${JSON.stringify(selected.diversionRoute)}]);
        map.fitBounds(bounds, { padding: [40, 40] });
      </script>
    </body>
    </html>
  `;

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
        <h1 className="page-title">Corridor-Specific Diversion Routes</h1>
        <p className="page-desc">Real-time alternative routing recommendations for congested major corridors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Corridors */}
        <div className="lg:col-span-4 space-y-3.5">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider px-1">Select Active Corridor</h3>
          <div className="space-y-2">
            {DIVERSIONS.map(d => {
              const active = d.id === selectedId;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    active
                      ? 'bg-primary-50 border-primary-300 shadow-sm'
                      : 'bg-surface-card border-surface-border hover:bg-surface-hover hover:border-surface-border-hover'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm font-semibold ${active ? 'text-primary-900' : 'text-ink'}`}>{d.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${severityColors[d.severity]}`}>
                      {d.severity}
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary mb-2 truncate">Bypass: {d.alternativeName}</p>
                  <div className="flex items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Save {d.savingsTime}
                    </span>
                    <span>•</span>
                    <span>{d.distance}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="card space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-surface-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">{selected.name}</h2>
                <p className="text-xs text-ink-muted mt-0.5">Primary Congestion: <span className="text-red-500 font-medium">{selected.congestedPoint}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted">Bypass Traffic:</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${trafficColors[selected.trafficLevel]}`}>
                  {selected.trafficLevel}
                </span>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-surface-subtle border border-surface-border/40 rounded-xl p-3.5">
                <p className="text-[10px] font-medium text-ink-muted">Normal Travel Time</p>
                <p className="text-base font-bold text-ink mt-0.5">{selected.normalTime}</p>
              </div>
              <div className="bg-surface-subtle border border-surface-border/40 rounded-xl p-3.5">
                <p className="text-[10px] font-medium text-ink-muted">Current Delay</p>
                <p className="text-base font-bold text-red-500 mt-0.5">+{selected.delayTime}</p>
              </div>
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3.5">
                <p className="text-[10px] font-medium text-primary-700">Net Time Savings</p>
                <p className="text-base font-bold text-primary-600 mt-0.5">{selected.savingsTime}</p>
              </div>
              <div className="bg-surface-subtle border border-surface-border/40 rounded-xl p-3.5">
                <p className="text-[10px] font-medium text-ink-muted">Total Route Length</p>
                <p className="text-base font-bold text-ink mt-0.5">{selected.distance}</p>
              </div>
            </div>

            {/* Live Leaflet Map Iframe */}
            <div className="border border-surface-border rounded-xl bg-slate-950 overflow-hidden h-[320px] relative">
              <iframe
                key={selected.id}
                srcDoc={mapHtml}
                className="w-full h-full border-0"
                title="Real-time Bypass Map"
              />
            </div>

            {/* Turn-by-Turn Steps */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Turn-by-Turn Route Execution</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {selected.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 bg-surface-subtle border border-surface-border/50 rounded-xl p-3.5">
                    <div className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-xs font-medium text-ink-secondary leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Panel */}
            <div className="border-t border-surface-border pt-5 space-y-3.5">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Execute Response Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => triggerAction('officer', 'Deployment Alert: 3 Traffic Patrol Units successfully dispatched.')}
                  disabled={activeActions['officer'] === 'success'}
                  className={`flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border transition-all ${
                    activeActions['officer'] === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white hover:bg-slate-50 border-surface-border text-slate-700 shadow-sm'
                  }`}
                >
                  {activeActions['officer'] === 'success' ? <Check size={14} /> : <Navigation size={14} />}
                  {activeActions['officer'] === 'success' ? 'Officers Dispatched' : 'Dispatch Officers'}
                </button>

                <button
                  onClick={() => triggerAction('maps', 'Map Broadcast: Diversion loop uploaded to Google Maps & Waze.')}
                  disabled={activeActions['maps'] === 'success'}
                  className={`flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border transition-all ${
                    activeActions['maps'] === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white hover:bg-slate-50 border-surface-border text-slate-700 shadow-sm'
                  }`}
                >
                  {activeActions['maps'] === 'success' ? <Check size={14} /> : <Send size={14} />}
                  {activeActions['maps'] === 'success' ? 'Broadcast Pushed' : 'Push to Map APIs'}
                </button>

                <button
                  onClick={() => triggerAction('sms', 'SMS Broadcast: 1,482 active commuters alerted in vicinity.')}
                  disabled={activeActions['sms'] === 'success'}
                  className={`flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border transition-all ${
                    activeActions['sms'] === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white hover:bg-slate-50 border-surface-border text-slate-700 shadow-sm'
                  }`}
                >
                  {activeActions['sms'] === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                  {activeActions['sms'] === 'success' ? 'Commuters Notified' : 'Trigger SMS Alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
