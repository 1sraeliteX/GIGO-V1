// Guided answers for the support chat widget. Keep answers in sync with the app.
export const SUPPORT_TOPICS = {
  getting_started: {
    label: 'Getting started',
    keywords: ['get started', 'getting started', 'start', 'begin', 'new here', 'register', 'sign up', 'create account', 'setup', 'set up'],
    answer:
      'Getting started takes about a minute:\n' +
      '1. Create your account on the Register page.\n' +
      '2. Add your first trading account (name and capital) from the account switcher at the top.\n' +
      '3. Tap the + button to log a trade.\n' +
      'Your calendar, stats and weekly breakdown update automatically as you log trades.',
    related: ['log_trade', 'accounts', 'subscription'],
  },
  log_trade: {
    label: 'Logging a trade',
    keywords: ['log a trade', 'log trade', 'add trade', 'record trade', 'trade form', 'lot size', 'risk reward', 'r:r', 'p&l', 'pnl', 'entry', 'notes'],
    answer:
      'Tap the + button (bottom right) to open the Add Trade form. Fill in the date, account, market type, pair, lot size, risk and result, then enter the P&L. Target, risk/reward, session and notes are optional.\n' +
      'Save the trade and it appears on the calendar, in your stats and in the weekly summary.',
    related: ['accounts', 'trade_limit', 'stats'],
  },
  accounts: {
    label: 'Accounts and currencies',
    keywords: ['multiple account', 'switch account', 'account switcher', 'add account', 'edit account', 'prop firm', 'demo account', 'capital', 'currency'],
    answer:
      'Tradora supports multiple accounts, such as Personal, Prop Firm or Demo. Use the account switcher at the top to move between them. Each account has its own starting capital and an optional max-trades-per-day limit, which you can edit in Settings > Accounts.\n' +
      'You can also change your display currency from the currency picker.',
    related: ['trade_limit', 'getting_started', 'stats'],
  },
  trade_limit: {
    label: 'Daily trade limit',
    keywords: ['daily limit', 'trade limit', 'max trades', 'limit reached', 'trade per day', 'trades per day'],
    answer:
      'Your daily trade limit is set per account. When you reach it, the app warns you before adding more trades. To change it, open Settings > Accounts and update Max Trades / Day. Your admin can also override it for your account.',
    related: ['accounts', 'subscription', 'getting_started'],
  },
  subscription: {
    label: 'Subscription and pricing',
    keywords: ['subscription', 'subscribe', 'plan', 'pricing', 'price', 'cost', 'expire', 'expired', 'renew', 'billing', 'access'],
    answer:
      'Tradora is subscription based. Open the subscribe popup to see the current Monthly, Quarterly and Yearly plans and their prices in USD. Each plan shows how many days of access it gives.\n' +
      'If your subscription expires, the subscribe popup returns and blocks the journal until you choose a plan.',
    related: ['payments', 'cancel', 'getting_started'],
  },
  payments: {
    label: 'Payments and activation',
    keywords: ['payment', 'pay', 'paystack', 'paid', 'activate', 'activation', 'card', 'declined', 'transaction', 'receipt'],
    answer:
      'Payments are handled by Paystack. After a successful payment your subscription should activate within seconds. If it did not, keep your payment reference or receipt and contact support. An admin can activate your subscription manually from the admin panel.',
    related: ['subscription', 'cancel', 'agent'],
  },
  grind_report: {
    label: 'Grind Report',
    keywords: ['grind', 'grind report', 'balance log', 'balance grid', 'win amount', 'loss amount', 'starting balance'],
    answer:
      'The Grind Report turns your trading into a step-by-step plan. Set your starting balance, win amount and loss amount under Grind Report > settings. Then use the tabs to view the Grind Table, Balance Log, Balance grid and Chart. Changing the settings rebuilds the plan.',
    related: ['stats', 'accounts', 'log_trade'],
  },
  stats: {
    label: 'Stats and calendar',
    keywords: ['stats', 'statistics', 'dashboard', 'win rate', 'calendar', 'heatmap', 'performance', 'weekly', 'monthly'],
    answer:
      'Your dashboard shows P&L, win rate, trade count and performance by week and month. The calendar is colour coded for winning and losing days, and the heatmap shows how consistently you trade.\n' +
      'All stats respect the account and month you have selected.',
    related: ['export', 'grind_report', 'log_trade'],
  },
  export: {
    label: 'Exporting trades',
    keywords: ['export', 'download', 'csv', 'pdf', 'excel', 'spreadsheet', 'report'],
    answer:
      'Open the weekly summary on the dashboard and use the CSV or PDF buttons to download your trades for a week, month or year. Exports respect the account you have selected.',
    related: ['stats', 'subscription', 'agent'],
  },
  forgot_password: {
    label: 'Password reset',
    keywords: ['forgot password', 'reset password', 'password reset', 'cant login', "can't login", 'login problem', 'email link'],
    answer:
      'Go to the Login page and click "Forgot password". Enter your email and we will send a reset link. If it does not arrive, check your spam folder and make sure you used the address you registered with.',
    related: ['security', 'getting_started', 'agent'],
  },
  cancel: {
    label: 'Cancel or refund',
    keywords: ['cancel', 'refund', 'stop subscription', 'unsubscribe', 'money back'],
    answer:
      'Subscriptions do not renew automatically. They simply expire on the end date shown in your plan. To stop access immediately or request a refund, talk to support so the team can review it for you.',
    related: ['subscription', 'payments', 'agent'],
  },
  security: {
    label: 'Data and security',
    keywords: ['security', 'secure', 'data', 'privacy', 'safe', 'broker login', 'password safety'],
    answer:
      'Your journal is tied to your own login and is not shared with other users. Use a unique password and never share it. Tradora never asks for your broker login or card details.',
    related: ['forgot_password', 'subscription', 'agent'],
  },
};

export const AGENT_OPTION = { label: 'Talk to a human agent', value: 'agent' };

export const INITIAL_TOPIC_IDS = ['getting_started', 'log_trade', 'subscription', 'grind_report'];

const AGENT_KEYWORDS = ['agent', 'human', 'person', 'support team', 'talk to someone', 'whatsapp', 'contact', 'help me directly'];

function normalize(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function findTopic(text) {
  const q = normalize(text);
  if (!q) return null;

  if (AGENT_KEYWORDS.some((word) => q.includes(word))) return 'agent';

  let best = null;
  let bestScore = 0;

  Object.entries(SUPPORT_TOPICS).forEach(([id, topic]) => {
    const score = topic.keywords.reduce((total, keyword) => {
      const k = normalize(keyword);
      if (!k) return total;
      return q.includes(k) ? total + k.length : total;
    }, 0);
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  });

  return best;
}

export function topicOptions(ids = INITIAL_TOPIC_IDS) {
  return ids
    .filter((id) => SUPPORT_TOPICS[id])
    .map((id) => ({ label: SUPPORT_TOPICS[id].label, value: id }));
}

export function followUpOptions(topicId) {
  const topic = SUPPORT_TOPICS[topicId];
  const related = (topic?.related || [])
    .filter((id) => id !== 'agent' && SUPPORT_TOPICS[id])
    .slice(0, 2)
    .map((id) => ({ label: SUPPORT_TOPICS[id].label, value: id }));
  return [...related, AGENT_OPTION];
}
