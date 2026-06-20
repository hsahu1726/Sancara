'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Compass, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface TourStep {
  path: string;
  title: string;
  desc: string;
  instruction: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    path: '/',
    title: 'Dashboard Metrics',
    desc: 'Provides a high-level overview of traffic event trends, distributions, and active incident diagnostics.',
    instruction: 'Review the key metrics at the top and the real-time activity trends below.',
  },
  {
    path: '/predict',
    title: 'Event Impact Prediction',
    desc: 'Uses the XGBoost ML model to predict congestion severity, estimated resolution time, and resource needs.',
    instruction: 'Fill in the event parameters (e.g., cause, corridor) and click Run AI Prediction.',
  },
  {
    path: '/heatmap',
    title: 'Historical Hotspot Map',
    desc: 'An interactive map plotting individual historical traffic incidents across Bangalore.',
    instruction: 'Click on any color-coded coordinate dot to view location and event cause details.',
  },
  {
    path: '/vulnerability',
    title: 'Junction Vulnerability Index',
    desc: 'Highlights critical junctions ranked by historical incident counts, average delays, and road closures.',
    instruction: 'Use the search bar to find vulnerable junctions and analyze their relative risk scores.',
  },
  {
    path: '/similarity',
    title: 'Historical Case Search',
    desc: 'Finds similar past incidents in the ASTRAM dataset using Cosine Similarity matching across features.',
    instruction: 'Input details of a new event to find the top 5 most similar historical matches.',
  },
  {
    path: '/autopsy',
    title: 'Response Replay & Autopsy',
    desc: 'Performs autopsy analysis on past events to determine counterfactual point-of-no-return and response efficacy.',
    instruction: 'Select a resolved event and run Autopsy to inspect timelines and identify potential delay savings.',
  },
  {
    path: '/corridors',
    title: 'Corridor Analysis',
    desc: 'Visualizes major Bengaluru corridors and lists their active congestion levels and junction nodes.',
    instruction: 'Select a corridor in the panel to highlight its route and view active events.',
  },
  {
    path: '/planned',
    title: 'Planned Event Analysis',
    desc: 'Details the 467 planned events (construction, VIP movement, protests, processions) from the ASTRAM dataset.',
    instruction: 'Hover over the charts to view scheduling hour distributions and top affected junctions.',
  },
  {
    path: '/simulator',
    title: 'What-If Scenario Simulator',
    desc: 'Compares two event configurations side-by-side using the ASTRAM-trained ML model.',
    instruction: 'Set a base and what-if scenario, click Run Simulation to contrast severity and cascade probability.',
  },
  {
    path: '/calendar',
    title: 'Historical Risk Calendar',
    desc: 'A daily heatmap grid of ASTRAM events across November 2023 – April 2024.',
    instruction: 'Navigate through months and click any day to inspect daily event statistics and anomalies.',
  },
  {
    path: '/broadcast',
    title: 'ಕನ್ನಡ Public Broadcast Generator',
    desc: 'Generates public traffic advisories in Kannada and English reference translations.',
    instruction: 'Click Generate ಕನ್ನಡ Broadcast to construct announcement texts, then click Copy to share.',
  },
  {
    path: '/chatbot',
    title: 'AI Chatbot',
    desc: 'Interactive assistant powered by ASTRAM domain context to answer traffic queries and suggest strategies.',
    instruction: 'Type your query or click on one of the quick suggestions to chat with the assistant.',
  },
  {
    path: '/resources',
    title: 'Resource Allocator',
    desc: 'Recommends traffic officers, barricades, and diversion plans based on event priority and road closures.',
    instruction: 'Adjust the input controls to receive operational resource recommendations.',
  },
];

export default function TourGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const currentStep = useMemo(() => TOUR_STEPS[stepIndex], [stepIndex]);

  // Handle positioning relative to sidebar elements
  useEffect(() => {
    if (!active || !currentStep) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      const linkId = `sidebar-link-${currentStep.path.replace('/', '') || 'dashboard'}`;
      const element = document.getElementById(linkId);

      if (element && window.innerWidth >= 1024) {
        const rect = element.getBoundingClientRect();
        // Position next to the sidebar link
        setCoords({
          top: Math.max(16, Math.min(window.innerHeight - 300, rect.top + (rect.height / 2) - 100)),
          left: rect.right + 16,
        });

        // Add a temporary highlight class/effect to the link
        element.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
      } else {
        setCoords(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    const timer = setTimeout(updatePosition, 200);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearTimeout(timer);

      // Clean up highlights
      const linkId = `sidebar-link-${currentStep.path.replace('/', '') || 'dashboard'}`;
      const element = document.getElementById(linkId);
      if (element) {
        element.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
      }
    };
  }, [active, stepIndex, pathname, currentStep]);

  useEffect(() => {
    // Listen for custom start tour trigger from Sidebar
    const handleStartTour = () => {
      startTour();
    };

    window.addEventListener('sancara_start_tour', handleStartTour);

    // Initial setup check
    const isTourActive = localStorage.getItem('sancara_tour_active') === 'true';
    const savedStep = localStorage.getItem('sancara_tour_step');
    const isTourCompleted = localStorage.getItem('sancara_tour_completed') === 'true';

    if (isTourActive && savedStep !== null) {
      const parsedStep = parseInt(savedStep, 10);
      setStepIndex(parsedStep);
      setActive(true);
      
      const step = TOUR_STEPS[parsedStep];
      if (step && pathname !== step.path) {
        router.push(step.path);
      }
    } else if (!isTourCompleted && pathname === '/') {
      setShowWelcome(true);
    }

    return () => {
      window.removeEventListener('sancara_start_tour', handleStartTour);
    };
  }, []);

  const saveStep = (index: number) => {
    // Clean up highlights of the old step
    const oldStep = TOUR_STEPS[stepIndex];
    if (oldStep) {
      const oldLinkId = `sidebar-link-${oldStep.path.replace('/', '') || 'dashboard'}`;
      const oldElement = document.getElementById(oldLinkId);
      if (oldElement) {
        oldElement.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
      }
    }

    setStepIndex(index);
    localStorage.setItem('sancara_tour_step', String(index));
    const step = TOUR_STEPS[index];
    if (step && pathname !== step.path) {
      router.push(step.path);
    }
  };

  const startTour = () => {
    setShowWelcome(false);
    setActive(true);
    localStorage.setItem('sancara_tour_active', 'true');
    localStorage.setItem('sancara_tour_completed', 'false');
    saveStep(0);
  };

  const nextStep = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      saveStep(stepIndex + 1);
    } else {
      endTour(true);
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      saveStep(stepIndex - 1);
    }
  };

  const endTour = (completed = false) => {
    // Clean up current highlights
    if (currentStep) {
      const linkId = `sidebar-link-${currentStep.path.replace('/', '') || 'dashboard'}`;
      const element = document.getElementById(linkId);
      if (element) {
        element.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
      }
    }

    setActive(false);
    setShowWelcome(false);
    localStorage.setItem('sancara_tour_active', 'false');
    if (completed) {
      localStorage.setItem('sancara_tour_completed', 'true');
    }
  };

  const progressPercent = ((stepIndex + 1) / TOUR_STEPS.length) * 100;

  return (
    <>
      {/* Welcome Modal Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="card max-w-md w-full p-6 text-center space-y-4 border-l-4 border-l-primary-500 shadow-2xl bg-white dark:bg-slate-900">
            <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/40 rounded-full flex items-center justify-center mx-auto text-primary-500">
              <Compass size={24} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink dark:text-slate-100">Welcome to Sancara</h3>
              <p className="text-xs text-ink-secondary dark:text-slate-300 leading-relaxed">
                Sancara is an Event Impact Forecasting and Response Intelligence System. Would you like a quick tour of our features, starting from the Dashboard and going all the way to Resources?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowWelcome(false);
                  localStorage.setItem('sancara_tour_completed', 'true');
                }}
                className="flex-1 px-4 py-2 border border-surface-border dark:border-slate-700 hover:bg-surface-hover dark:hover:bg-slate-800 text-ink-secondary dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Skip Tour
              </button>
              <button
                onClick={startTour}
                className="flex-1 btn-primary text-xs py-2"
              >
                Start Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Tour Modal/Banner (Bottom Right or positioned adjacent to Sidebar link) */}
      {active && currentStep && (
        <div
          className="fixed z-50 max-w-sm w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-surface-border/80 dark:border-slate-800/80 shadow-2xl p-5 space-y-4 animate-slide-up"
          style={coords ? {
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            bottom: 'auto',
            right: 'auto'
          } : {
            bottom: '16px',
            right: '16px'
          }}
        >
          {/* Tooltip pointing arrow for desktop adjacent popups */}
          {coords && (
            <div className="absolute top-[90px] -left-2 w-4 h-4 bg-white dark:bg-slate-900 border-l border-b border-surface-border/80 dark:border-slate-800/80 rotate-45 pointer-events-none" />
          )}

          {/* Progress bar */}
          <div className="h-1 w-full bg-surface-border/40 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">
                Step {stepIndex + 1} of {TOUR_STEPS.length}
              </span>
              <h3 className="text-sm font-bold text-ink dark:text-slate-100 flex items-center gap-1.5">
                <Compass size={14} className="text-primary-500" />
                {currentStep.title}
              </h3>
            </div>
            <button
              onClick={() => endTour()}
              className="p-1 rounded-lg hover:bg-surface-hover dark:hover:bg-slate-800 text-ink-muted dark:text-slate-500 transition-colors"
              title="Close Tour"
            >
              <X size={14} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-ink-secondary dark:text-slate-300 leading-relaxed">
            {currentStep.desc}
          </p>

          {/* One-liner Instruction */}
          {currentStep.instruction && (
            <div className="bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100/60 dark:border-primary-900/40 rounded-xl p-2.5">
              <p className="text-[11px] font-semibold text-primary-700 dark:text-primary-400">
                Instruction:
              </p>
              <p className="text-[11px] text-ink-secondary dark:text-slate-400 mt-0.5 leading-snug">
                {currentStep.instruction}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => endTour()}
              className="text-[10px] font-semibold text-ink-muted dark:text-slate-500 hover:text-ink dark:hover:text-slate-300 transition-colors"
            >
              Skip Tour
            </button>
            <div className="flex gap-2">
              <button
                onClick={prevStep}
                disabled={stepIndex === 0}
                className="p-1.5 rounded-xl border border-surface-border dark:border-slate-700 hover:bg-surface-hover dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-ink-secondary dark:text-slate-400 transition-colors"
                title="Previous step"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={nextStep}
                className="btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1"
              >
                {stepIndex === TOUR_STEPS.length - 1 ? (
                  <>
                    Finish <Check size={12} />
                  </>
                ) : (
                  <>
                    Next <ChevronRight size={12} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
