import { useState } from 'react';
import { BarChart3, Shield, Activity, Target, PieChart, ChevronRight, X } from 'lucide-react';

const slides = [
  {
    icon: BarChart3,
    title: 'Track Real Data',
    description: 'Log every trade with precision and get detailed feedback on your performance. Know exactly where you stand with accurate record-keeping.',
  },
  {
    icon: Shield,
    title: 'Stop Loss & Scaling',
    description: 'Master risk management. Track your stop losses, manage position sizes, and scale your strategies for consistent growth.',
  },
  {
    icon: Activity,
    title: 'Real-time Feedback',
    description: 'Get instant insights on your trading activity. Monitor your progress daily and adjust your approach with live analytics.',
  },
  {
    icon: Target,
    title: 'Know Your Win Rate',
    description: 'See your true win rate with real-time data. Track wins, losses, and risk-reward ratios to make informed decisions.',
  },
  {
    icon: PieChart,
    title: 'Study Your Patterns',
    description: 'Discover your trading patterns over time. Identify what works, what doesn\'t, and refine your strategy for better results.',
  },
];

export default function OnboardingOverlay({ onComplete, onSkip }) {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isLast = current === slides.length - 1;
  const Icon = slide.icon;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-lg mx-4 overflow-hidden">
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 sm:p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Icon className="w-8 h-8 text-emerald-400" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            {slide.title}
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
            {slide.description}
          </p>
        </div>

        <div className="px-8 sm:px-10 pb-8 sm:pb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-6 bg-emerald-500'
                    : 'w-1.5 bg-neutral-700'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-[#fff] rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
