import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, X, Sparkles } from 'lucide-react';

const GAP = 14;
const PAD = 12;

export const DASHBOARD_STEPS = [
  {
    target: '[data-tour="header"]',
    title: 'Navigation Header',
    content: 'Access all sections from here. The account switcher lets you toggle between trading accounts.',
    position: 'bottom',
  },
  {
    target: '[data-tour="stats"]',
    title: 'Monthly Summary',
    content: 'Quick stats for the selected month: total P&L, win rate, and trade count.',
    position: 'top',
  },
  {
    target: '[data-tour="calendar"]',
    title: 'Performance Calendar',
    content: 'Each cell is a trading day. Colors show profit (green) or loss (red). Click any day to view its trades.',
    position: 'top',
  },
  {
    target: '[data-tour="add-trade"]',
    title: 'Add Trades',
    content: 'Click here to log a new trade. Fill in the details and the system calculates your metrics automatically.',
    position: 'left',
  },
  {
    target: '[data-tour="trades-list"]',
    title: 'Trade History',
    content: 'View all trades for the current month. Edit, duplicate, or delete entries from here.',
    position: 'left',
  },
  {
    target: '[data-tour="menu"]',
    title: 'More Features',
    content: 'Access Grind Report, Balance Simulation, and the Admin panel from the menu.',
    position: 'bottom',
  },
];

export const ADMIN_STEPS = [
  {
    target: '[data-tour="admin-nav"]',
    title: 'Admin Navigation',
    content: 'Jump between Overview, Users, Subscriptions, Plans, Payments, Email and the Support Widget. Changes here apply to every trader immediately.',
    position: 'right',
  },
  {
    target: '[data-tour="admin-stats"]',
    title: 'Platform Overview',
    content: 'Total users, active subscribers, override users, admin users and trades logged — the health of the whole platform at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="admin-exit"]',
    title: 'Back To The App',
    content: '"Back to Tradora" returns you to the trader dashboard, and Logout ends this admin session.',
    position: 'right',
  },
];

function readRect(target) {
  const el = target ? document.querySelector(target) : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function sameRect(a, b) {
  return !!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

const clamp = (value, min, max) => (max < min ? min : Math.min(Math.max(value, min), max));

function spotlightFrom(r) {
  if (!r) return null;
  return {
    top: clamp(r.top, PAD, window.innerHeight - PAD),
    left: clamp(r.left, PAD, window.innerWidth - PAD),
    width: Math.min(r.width, window.innerWidth - PAD * 2),
    height: Math.min(r.height, window.innerHeight - PAD * 2),
  };
}

export default function OnboardingTour({ isOpen, onComplete, onSkip, steps = DASHBOARD_STEPS }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [tipPos, setTipPos] = useState(null);
  const tipRef = useRef(null);
  const callbacks = useRef({ onComplete, onSkip });

  useEffect(() => {
    callbacks.current = { onComplete, onSkip };
  });

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setRect(null);
      setTipPos(null);
      return;
    }

    // Skip steps whose element is not rendered on the current page.
    let index = step;
    while (index < steps.length && !document.querySelector(steps[index].target)) index += 1;
    if (index >= steps.length) {
      callbacks.current.onComplete();
      return;
    }
    if (index !== step) {
      setStep(index);
      return;
    }

    document.querySelector(steps[index].target).scrollIntoView({ block: 'center', behavior: 'auto' });

    const measure = () => {
      const next = readRect(steps[index].target);
      if (!next) return;
      setRect(prev => (sameRect(prev, next) ? prev : next));
    };
    measure();

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, step, steps]);

  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') callbacks.current.onSkip();
      else if (e.key === 'ArrowRight') setStep(s => Math.min(steps.length - 1, s + 1));
      else if (e.key === 'ArrowLeft') setStep(s => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, steps.length]);

  const currentStep = steps[step];
  const spotlight = spotlightFrom(rect);

  // Place the tooltip beside the spotlight, flipping sides when it would overflow the viewport.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!isOpen || !currentStep || !tip || !spotlight) return;

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const centerX = spotlight.left + spotlight.width / 2 - tw / 2;
    const centerY = spotlight.top + spotlight.height / 2 - th / 2;
    const sides = {
      top: { top: spotlight.top - th - GAP, left: centerX },
      bottom: { top: spotlight.top + spotlight.height + GAP, left: centerX },
      left: { top: centerY, left: spotlight.left - tw - GAP },
      right: { top: centerY, left: spotlight.left + spotlight.width + GAP },
    };

    const preferred = currentStep.position || 'bottom';
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[preferred];
    const order = [preferred, opposite, 'bottom', 'top', 'right', 'left']
      .filter((side, i, all) => all.indexOf(side) === i);

    const fits = (p) => p.top >= PAD && p.top + th <= vh - PAD && p.left >= PAD && p.left + tw <= vw - PAD;
    const candidate = order.map(side => sides[side]).find(fits) || sides[preferred];
    const next = {
      top: Math.round(clamp(candidate.top, PAD, vh - th - PAD)),
      left: Math.round(clamp(candidate.left, PAD, vw - tw - PAD)),
    };
    setTipPos(prev => (prev && prev.top === next.top && prev.left === next.left ? prev : next));
  }, [isOpen, rect, step, spotlight, currentStep]);

  if (!isOpen || !currentStep) return null;

  const handleNext = () => {
    if (isLast) callbacks.current.onComplete();
    else setStep(s => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {/* Blocks page interaction while the tour runs; the dark backdrop comes from the ring's box-shadow */}
      <div className="absolute inset-0 pointer-events-auto" />

      {spotlight && (
        <div
          className="absolute border-2 border-emerald-400 rounded-lg pointer-events-none transition-all duration-300"
          style={{
            top: spotlight.top - 4,
            left: spotlight.left - 4,
            width: spotlight.width + 8,
            height: spotlight.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          }}
        />
      )}

      <div
        ref={tipRef}
        className={`absolute w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-5 pointer-events-auto ${tipPos ? 'opacity-100' : 'opacity-0'}`}
        style={{ top: tipPos?.top ?? 0, left: tipPos?.left ?? 0 }}
      >
        <button
          onClick={() => callbacks.current.onSkip()}
          className="absolute top-3 right-3 p-1 text-neutral-500 hover:text-white transition-colors"
          title="Close tour"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 mb-4 pr-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-emerald-500' : i < step ? 'w-2 bg-emerald-600' : 'w-2 bg-neutral-700'
              }`}
            />
          ))}
          <span className="ml-auto text-xs text-neutral-500">
            {step + 1} / {steps.length}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <h3 className="text-sm font-semibold text-white">{currentStep.title}</h3>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed mb-4">
          {currentStep.content}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => callbacks.current.onSkip()}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Skip tour
          </button>
          <div className="flex-1" />
          {step > 0 && (
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-[#fff] rounded-lg font-medium transition-colors flex items-center gap-1"
          >
            {isLast ? 'Finish' : 'Next'}
            {!isLast && <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
