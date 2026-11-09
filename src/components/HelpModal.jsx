import { X, HelpCircle } from 'lucide-react';

const helpContent = {
  dashboard: {
    title: 'Dashboard',
    sections: [
      {
        heading: 'Calendar View',
        content: 'Each square represents a trading day. Green = profitable, Red = loss, Gray = no trades. Click any day to see detailed trades.',
      },
      {
        heading: 'Monthly Stats',
        content: 'Top cards show your total P&L, win rate, and trade count for the selected month. These update automatically as you add trades.',
      },
      {
        heading: 'Navigation',
        content: 'Use the arrows to move between months. The year/month selector lets you jump to any specific period.',
      },
    ],
  },
  trade: {
    title: 'Adding a Trade',
    sections: [
      {
        heading: 'Trade Date',
        content: 'The date the trade was executed. Use the calendar picker or type directly (YYYY-MM-DD).',
      },
      {
        heading: 'Market Type',
        content: 'Select your market: Forex, Crypto, Commodities, Indices, Stocks, or Derived (synthetics like Volatility Index).',
      },
      {
        heading: 'Pair/Symbol',
        content: 'The instrument traded. Type to search or select from the dropdown. Examples: EURUSD, BTCUSD, XAUUSD, US30.',
      },
      {
        heading: 'Lot Size',
        content: 'Position size. For forex: standard lots (1.0 = 100,000 units). For crypto: number of coins. For stocks: shares.',
      },
      {
        heading: 'Risk Type',
        content: 'How you measure risk: "Amount" = fixed currency risk (e.g., $50). "Percentage" = % of account (e.g., 2%).',
      },
      {
        heading: 'Risk Value',
        content: 'The actual risk amount or percentage. If you risked $50 on a trade, enter 50.',
      },
      {
        heading: 'Result',
        content: 'Win = profitable trade. Loss = losing trade. The P&L sign will auto-adjust based on your selection.',
      },
      {
        heading: 'P&L Amount',
        content: 'Profit or loss in currency. Positive for wins, negative for losses. The system auto-corrects the sign.',
      },
      {
        heading: 'Target Amount (Optional)',
        content: 'Your planned profit target before entering the trade. Helps track if you hit your targets.',
      },
      {
        heading: 'Risk:Reward (Optional)',
        content: 'Planned RR ratio, e.g., "1:3" means risking $1 to make $3. Useful for analyzing trade selection.',
      },
      {
        heading: 'Session (Optional)',
        content: 'Trading session: Asia, London, New York, or Overlap. Helps identify when you perform best.',
      },
      {
        heading: 'Notes (Optional)',
        content: 'Any observations: entry reason, emotions, mistakes, lessons. Great for review.',
      },
    ],
  },
  accounts: {
    title: 'Accounts',
    sections: [
      {
        heading: 'What are Accounts?',
        content: 'Separate trading accounts to track different strategies, brokers, or capital pools independently.',
      },
      {
        heading: 'Account Capital',
        content: 'Starting balance for the account. Used to calculate percentage returns and risk limits.',
      },
      {
        heading: 'Daily Trade Limit',
        content: 'Maximum trades allowed per day for this account. Prevents overtrading. Leave empty for unlimited.',
      },
      {
        heading: 'Switching Accounts',
        content: 'Use the account switcher in the header to view stats and trades for a specific account.',
      },
    ],
  },
  grind: {
    title: 'Grind Report',
    sections: [
      {
        heading: 'What is the Grind Report?',
        content: 'A performance consistency tracker showing how steadily you grow your account over time. Measures "grinding" behavior.',
      },
      {
        heading: 'Start Balance',
        content: 'Your account balance when you started tracking. Set it on the Balance Simulation page.',
      },
      {
        heading: 'Win/Loss Amount',
        content: 'Expected profit/loss per trade for consistency scoring. The report checks if you stick to these targets.',
      },
      {
        heading: 'P&L Mode',
        content: '"Fixed" = the same win/loss amount each trade. "Actual" = the real P/L recorded on each trade.',
      },
      {
        heading: 'Balance Simulation',
        content: 'Open Menu → Balance Simulation to test different account sizes against your grind. Change the start balance or win/loss amounts, save, and the report recalculates — your logged trades are never touched.',
      },
      {
        heading: 'Consistency Score',
        content: 'Percentage of days you hit your targets. Higher = more disciplined trading.',
      },
      {
        heading: 'Market Orders',
        content: 'Track specific trade setups you want to monitor. Add them in settings to see performance per setup.',
      },
    ],
  },
  settings: {
    title: 'Settings',
    sections: [
      {
        heading: 'Currency',
        content: 'Display currency for all amounts. USD, EUR, GBP, NGN, and more. Does not convert values, only changes the symbol.',
      },
      {
        heading: 'Timezone',
        content: 'Your local timezone. Affects which trading session is highlighted as "active" when adding trades.',
      },
      {
        heading: 'Theme',
        content: 'Light or dark mode. Preference is saved and persists across sessions.',
      },
    ],
  },
  admin: {
    title: 'Admin Panel',
    sections: [
      {
        heading: 'Users',
        content: 'View all registered users. Grant/revoke admin access, manage subscriptions, and delete accounts.',
      },
      {
        heading: 'Subscriptions',
        content: 'View active subscriptions. Manually extend or revoke access. Set permanent access for special users.',
      },
      {
        heading: 'Plans',
        content: 'Configure subscription plans: pricing, duration, descriptions. Changes affect checkout immediately.',
      },
      {
        heading: 'Payments',
        content: 'Manage Paystack API keys for payment processing. Test connection to verify credentials.',
      },
      {
        heading: 'Support',
        content: 'Configure the live support chat widget. Set WhatsApp number for handoff and business hours.',
      },
      {
        heading: 'Stats',
        content: 'Platform overview: total users, active subscriptions, revenue, and growth metrics.',
      },
    ],
  },
};

export default function HelpModal({ topic, isOpen, onClose }) {
  if (!isOpen) return null;

  const content = helpContent[topic];
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">{content.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {content.sections.map((section, i) => (
            <div key={i} className="space-y-1.5">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
                {section.heading}
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
