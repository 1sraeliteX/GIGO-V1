import { useState } from 'react';
import { fmtMoney } from './shared';
import { useCurrency } from '../../context/CurrencyContext';

function streakText(s, kind) {
  if (!s || !s.length) return '—';
  return `${s.length} ${kind}, ${s.market}, trades ${s.from}–${s.to}`;
}

export default function StatsPanel({ report }) {
  const { stats, log } = report;
  const { currency } = useCurrency();
  const [lookup, setLookup] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  const doLookup = () => {
    const n = parseInt(lookup, 10);
    if (isNaN(n) || n < 0 || n > stats.total_trades) {
      setLookupResult({ error: `Enter a trade number between 0 and ${stats.total_trades}` });
      return;
    }
    const entries = log.filter(e => e.n > 0 && e.n <= n);
    const wins = entries.filter(e => e.result === 'W').length;
    const entry = log[n];
    setLookupResult({
      n,
      wins,
      losses: entries.length - wins,
      balance: entry.balance,
      net: entry.balance - report.settings.start_balance,
    });
  };

  const win = { color: 'var(--win-color)' };
  const loss = { color: 'var(--loss-color)' };
  const money = (n) => fmtMoney(n, currency.symbol);

  const cards = [
    ['Win rate', `${stats.win_rate}%`, stats.win_rate > 0 ? win : undefined],
    ['Total trades', stats.total_trades, undefined],
    ['Wins', stats.wins, stats.wins > 0 ? win : undefined],
    ['Losses', stats.losses, stats.losses > 0 ? loss : undefined],
    ['Max drawdown', `${money(stats.max_drawdown)} (${stats.max_drawdown_pct}%)`, stats.max_drawdown > 0 ? loss : undefined],
    ['Longest win streak', streakText(stats.longest_win_streak, 'wins'), stats.longest_win_streak?.length ? win : undefined],
    ['Longest losing streak', streakText(stats.longest_loss_streak, 'losses'), stats.longest_loss_streak?.length ? loss : undefined],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map(([label, value, valueStyle]) => (
          <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 min-w-0">
            <div className="text-[10px] text-neutral-500">{label}</div>
            <div className="text-sm font-semibold text-white break-words" style={valueStyle}>{value}</div>
          </div>
        ))}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-neutral-500 mb-1">Balance at trade N</div>
          <div className="flex gap-1">
            <input type="number" min="0" max={stats.total_trades} value={lookup}
              onChange={e => setLookup(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLookup()}
              placeholder="e.g. 500"
              className="w-full min-w-0 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500" />
            <button onClick={doLookup} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-[#fff] rounded px-2 py-1 transition-colors">Go</button>
          </div>
          {lookupResult && (
            lookupResult.error
              ? <p className="text-[11px] mt-1" style={{ color: 'var(--loss-color)' }}>{lookupResult.error}</p>
              : <p className="text-[11px] text-neutral-300 mt-1 break-words">
                  N={lookupResult.n}: <span style={win}>{lookupResult.wins}W</span> / <span style={loss}>{lookupResult.losses}L</span> · balance {money(lookupResult.balance)} · net <span style={lookupResult.net >= 0 ? win : loss}>{lookupResult.net >= 0 ? '+' : ''}{money(lookupResult.net)}</span>
                </p>
          )}
        </div>
      </div>

      {stats.longest_loss_streak_per_market.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-neutral-500 mb-1">Longest losing streak per market</div>
          <ul className="text-xs text-neutral-300 space-y-0.5">
            {stats.longest_loss_streak_per_market.map(s => (
              <li key={s.market} className="break-words" style={loss}>{s.length} losses, {s.market}, trades {s.from}–{s.to}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}