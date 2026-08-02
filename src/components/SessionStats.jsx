import { useMemo } from 'react';
import { SESSIONS, SESSION_MAP } from '../constants/sessions';
import { useCurrency } from '../context/CurrencyContext';

/**
 * SessionStats — shows a per-session breakdown (win rate, P&L, trade count)
 * for the currently visible trades (month/account filtered).
 */
export default function SessionStats({ trades }) {
  const { formatMoney } = useCurrency();

  const stats = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    // Aggregate per session key
    const map = {};
    SESSIONS.forEach((s) => {
      map[s.key] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
    });

    let untagged = 0;

    trades.forEach((t) => {
      const pnl = parseFloat(t.pnl_amount);
      if (t.session && map[t.session]) {
        map[t.session].trades += 1;
        map[t.session].pnl += pnl;
        if (t.result === 'win') map[t.session].wins += 1;
        else map[t.session].losses += 1;
      } else {
        untagged += 1;
      }
    });

    const rows = SESSIONS.map((s) => ({
      ...s,
      ...map[s.key],
      winRate: map[s.key].trades > 0
        ? Math.round((map[s.key].wins / map[s.key].trades) * 100)
        : null,
    })).filter((r) => r.trades > 0);

    return { rows, untagged };
  }, [trades]);

  if (!stats || stats.rows.length === 0) return null;

  return (
    <div className="mb-4 bg-neutral-900 rounded-xl border border-neutral-800 p-3 sm:p-5">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <span className="text-base">🕐</span>
        <h3 className="text-sm font-semibold text-white">Session Breakdown</h3>
        {stats.untagged > 0 && (
          <span className="ml-auto text-[10px] text-neutral-600">
            {stats.untagged} trade{stats.untagged !== 1 ? 's' : ''} untagged
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {stats.rows.map((s) => (
          <div
            key={s.key}
            className="rounded-lg p-3 border"
            style={{
              backgroundColor: s.color + '12',
              borderColor: s.color + '40',
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{s.emoji}</span>
              <span className="text-xs font-semibold text-white truncate">{s.label}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">Trades</span>
                <span className="text-neutral-300 font-medium">{s.trades}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">Win Rate</span>
                <span
                  className="font-medium"
                  style={{ color: s.winRate !== null && s.winRate >= 50 ? 'rgb(var(--win-color-rgb))' : 'rgb(var(--loss-color-rgb))' }}
                >
                  {s.winRate !== null ? `${s.winRate}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">P&L</span>
                <span
                  className="font-medium tabular-nums"
                  style={{ color: s.pnl >= 0 ? 'rgb(var(--win-color-rgb))' : 'rgb(var(--loss-color-rgb))' }}
                >
                  {s.pnl >= 0 ? '+' : ''}{formatMoney(s.pnl)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">W / L</span>
                <span className="text-neutral-400">{s.wins} / {s.losses}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
