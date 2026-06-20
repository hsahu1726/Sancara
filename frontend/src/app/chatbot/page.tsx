'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, AlertTriangle, ShieldAlert, Cpu, ClipboardList, Info, Navigation } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  cards?: {
    type: 'alert' | 'resources' | 'diversion';
    title: string;
    details: string[];
  }[];
}

const PRESETS = [
  'Assess Hebbal Flyover congestion risk',
  'Recommend resources for waterlogging event',
  'Draft incident report for Silk Board accident',
  'What is the detour route for Mysore Road?'
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am **Sañcāra Copilot**, your event impact and response intelligence assistant. I can help you analyze traffic congestion data, generate resource coordination plans, or draft diversion loop directives. What would you like to coordinate today?',
      timestamp: '12:00 PM'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const generateReply = (query: string): { text: string; cards?: Message['cards'] } => {
    const q = query.toLowerCase();

    if (q.includes('hebbal') || q.includes('bellary')) {
      return {
        text: 'Analyzing **Bellary Road (near Hebbal Flyover)** corridor parameters. I have detected an active bottleneck due to an unplanned vehicle breakdown.\n\nHere are the live network metrics and recommendations:',
        cards: [
          {
            type: 'alert',
            title: 'Critical Impact Alert',
            details: [
              'Primary Congestion Score: 8.2 / 10',
              'Estimated Resolution: 35 minutes',
              'Cascade Risk: 78% (high probability of arterial gridlock if left unmanaged)'
            ]
          },
          {
            type: 'diversion',
            title: 'Bypass Routing Protocol',
            details: [
              'Diversion Bypass: Thanisandra - Hennur Road loop',
              'Est. Time Savings: 15 minutes',
              'Action: Dispatch traffic patrol units to guide heavy vehicles to outer ring road'
            ]
          }
        ]
      };
    }

    if (q.includes('waterlogging') || q.includes('rain') || q.includes('flood')) {
      return {
        text: 'Localized waterlogging events are predicted for the **East & South Zones** due to intense precipitation. Key high-vulnerability intersections are: Central Silk Board, Ecospace ORR, and Majestic underpass.\n\nRecommended emergency response checklist:',
        cards: [
          {
            type: 'resources',
            title: 'Resource Allocation Plan',
            details: [
              'Deploy 4 Traffic Marshals to redirect traffic clear of deep-water zones.',
              'Place 12 high-visibility orange barricades at underpass entry gates.',
              'Alert BBMP drainage clearance pump units (Region East).',
              'Trigger SMS warning alerts to active commuters within 2km.'
            ]
          }
        ]
      };
    }

    if (q.includes('silk board') || q.includes('accident')) {
      return {
        text: 'Drafting **Incident Report & Response Plan** for the collision reported near Central Silk Board flyover entry lane:\n\n**Incident Details:** Rear-end collision involving two passenger cars. Lane 1 blocked.\n**Current Delay:** +24 minutes and growing.\n**Action Directive:**',
        cards: [
          {
            type: 'alert',
            title: 'Dispatch & Safety Checklist',
            details: [
              'Traffic Units: 2 patrol bikes dispatched (ETA 6 mins).',
              'Towing Asset: Alerted recovery crane (Silk Board Depot).',
              'Public Alert: Broadcasted route warning via Google Maps API.',
              'Detour: Route light vehicles through HSR Sector 3 secondary loop.'
            ]
          }
        ]
      };
    }

    if (q.includes('mysore road') || q.includes('detour') || q.includes('diversion')) {
      return {
        text: 'The recommended alternative route bypass for Mysore Road congestion is the **Chord Road - Magadi Link** detour:\n\n1. **Detour Entry:** Divert at Mysore Road Metro Station onto West of Chord Road.\n2. **Bypass Path:** Proceed north, exit right at Magadi Main Road.\n3. **Re-entry Point:** Rejoin Mysore Road via Outer Ring Road connector.\n\n**Savings Info:** Net travel time savings is **11 minutes** compared to the congested primary corridor route.',
      };
    }

    if (q.includes('resource') || q.includes('officer') || q.includes('barricade')) {
      return {
        text: 'Accessing **Response Asset Database**:\n\nCurrently active in Sector-4 Central Zone:\n- **Traffic Officers:** 18 active, 4 standby\n- **Barricades:** 45 in reserve at central warehouse\n- **Mobile Towing Cranes:** 2 active, 1 standby\n- **Digital VMS boards:** 8 active broadcasting detour loops\n\nTo allocate assets to a specific junction, please use the **Prediction** parameters panel.',
      };
    }

    // Default reply
    return {
      text: 'I have analyzed your query. As Sañcāra Copilot, I can generate detours or predict impact probabilities for traffic incidents. Try asking me:\n\n* *"Assess Hebbal Flyover congestion risk"* \n* *"Recommend resources for waterlogging event"* \n* *"What is the detour route for Mysore Road?"*',
    };
  };

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const replyData = generateReply(textToSend);
      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: replyData.text,
        cards: replyData.cards,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-in">
      <div className="page-header border-b border-surface-border pb-4 shrink-0">
        <h1 className="page-title flex items-center gap-2">
          <Sparkles size={20} className="text-primary-500" /> Sañcāra Copilot
        </h1>
        <p className="page-desc">AI-powered incident command assistant and response loop drafting engine</p>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Left Suggestions Pane */}
        <div className="lg:col-span-3 space-y-4 flex flex-col justify-between p-4 bg-surface-card dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-2xl h-fit lg:h-full">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={14} className="text-primary-500" /> Scenario Presets
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(preset)}
                  className="text-left p-3.5 rounded-xl border border-surface-border dark:border-slate-800 hover:bg-surface-hover dark:hover:bg-slate-800 hover:border-surface-border-hover transition-all text-xs font-medium text-ink-secondary dark:text-slate-300 leading-relaxed bg-surface-subtle dark:bg-slate-950/40"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-surface-border pt-4 mt-4 hidden lg:block">
            <div className="flex items-start gap-2.5 bg-primary-50/70 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40 rounded-xl p-3.5">
              <Info size={16} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-primary-700 dark:text-primary-300 leading-normal">
                Sañcāra Copilot drafts immediate response loops by cross-referencing real-time incident parameters with historical patterns.
              </p>
            </div>
          </div>
        </div>

        {/* Right Chat Pane */}
        <div className="lg:col-span-9 flex flex-col bg-surface-card dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-2xl overflow-hidden h-full">
          {/* Scrollable logs */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40 dark:bg-slate-950/40">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] space-y-2`}>
                  {/* Sender name & time */}
                  <div className={`flex items-center gap-2 px-1 text-[10px] text-ink-muted ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-semibold text-ink-secondary">{msg.sender === 'user' ? 'Dispatcher' : 'Copilot AI'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message bubble */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                    msg.sender === 'user'
                      ? 'bg-primary-500 border-primary-600 text-white shadow-sm rounded-tr-none'
                      : 'bg-white border-surface-border text-ink shadow-sm rounded-tl-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
                  }`}>
                    {/* Markdown rendering helper (simple bold/code formatting) */}
                    <p className="whitespace-pre-line" dangerouslySetInnerHTML={{
                      __html: msg.text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 dark:text-slate-200 px-1 py-0.5 rounded text-xs">$1</code>')
                    }} />
                  </div>

                  {/* Structured Result Cards */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {msg.cards.map((card, cIdx) => (
                        <div key={cIdx} className="bg-white border border-surface-border shadow-card rounded-xl p-4 space-y-2.5 dark:bg-slate-850 dark:border-slate-800">
                          <h4 className="text-xs font-bold text-ink dark:text-slate-50 flex items-center gap-1.5 border-b border-surface-border dark:border-slate-800 pb-2">
                            {card.type === 'alert' && <ShieldAlert size={14} className="text-red-500" />}
                            {card.type === 'resources' && <ClipboardList size={14} className="text-primary-500" />}
                            {card.type === 'diversion' && <Navigation size={14} className="text-emerald-500" />}
                            {card.title}
                          </h4>
                          <ul className="space-y-1.5">
                            {card.details.map((detail, dIdx) => (
                              <li key={dIdx} className="text-[11px] text-ink-secondary dark:text-slate-400 leading-relaxed flex items-start gap-1.5">
                                <span className="text-primary-500 font-bold shrink-0 mt-0.5">•</span>
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-1 text-[10px] text-ink-muted">
                    <span className="font-semibold text-ink-secondary">Copilot AI</span>
                    <span>•</span>
                    <span>Typing...</span>
                  </div>
                  <div className="bg-white border border-surface-border text-ink rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Bottom input area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3.5 border-t border-surface-border bg-white dark:bg-slate-900 dark:border-slate-800 flex gap-3 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask Copilot for detour route details or resource suggestions..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-surface-subtle border border-surface-border dark:bg-slate-950/40 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/20 text-ink dark:text-slate-100 placeholder:text-ink-muted dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-11 h-11 rounded-xl bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
