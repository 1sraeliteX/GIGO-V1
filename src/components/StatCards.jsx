import { api } from '../services/api';
import { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';

const cards = [
  { key: 'total_trades', label: 'Total Trades', icon: '📊' },
  { key: 'balance', label: 'Balance', icon: '💰' },
  { key: 'best_day', label: 'Best Day', icon: '📈' },
  { key: 'worst_day', label: 'Worst Day', icon: '📉' },
  { key: 'win_rate', label: 'Win Rate', icon: '🎯' },
];

export default function StatCards({ month, accountId, accountCapital, refreshKey }) {
  const { formatMoney } = useCurrency();
  const [monthStats, setMonthStats] = useState(null);
  const [allTimeStats, setAllTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const monthParams = `month=${month}${accountId ? `&account_id=${accountId}` : ''}`;
    Promise.all([
      api.stats.get(monthParams),
      api.stats.getAllTime(accountId),
    ]).then(([m, a]) => {
      setMonthStats(m);
      setAllTimeStats(a);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [month, accountId, refreshKey]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {cards.map((c) => (
          <div key={c.key} className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 sm:p-5 animate-pulse">
            <div className="h-3 sm:h-4 bg-neutral-800 rounded w-12 sm:w-16 mb-2 sm:mb-3" />
            <div className="h-6 sm:h-8 bg-neutral-800 rounded w-16 sm:w-24" />
          </div>
        ))}
      </div>
    );
  }

  const getValueColor = (card) => {
    if (!monthStats || !allTimeStats) return { color: 'rgb(var(--white))' };
    if (card.key === 'balance') {
      const balance = accountCapital > 0 ? accountCapital + allTimeStats.total_pnl : allTimeStats.total_pnl;
      return balance >= 0 ? { color: 'rgb(var(--win-color-rgb))' } : { color: 'rgb(var(--loss-color-rgb))' };
    }
    if (card.key === 'best_day') return { color: 'rgb(var(--win-color-rgb))' };
    if (card.key === 'worst_day') return allTimeStats.worst_day ? { color: 'rgb(var(--loss-color-rgb))' } : { color: 'rgb(var(--n4))' };
    return { color: 'rgb(var(--white))' };
  };

  const getValue = (card) => {
    if (!monthStats || !allTimeStats) return '-';
    if (card.key === 'total_trades') return allTimeStats.total_trades;
    if (card.key === 'balance') {
      const balance = accountCapital > 0 ? accountCapital + allTimeStats.total_pnl : allTimeStats.total_pnl;
      return formatMoney(balance);
    }
    if (card.key === 'win_rate') return `${allTimeStats.win_rate}%`;
    return '-';
  };

  const formatDayLabel = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {cards.map((card) => (
        <div key={card.key} className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 sm:p-5 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className="text-base sm:text-lg shrink-0">{card.icon}</span>
            <span className="text-neutral-400 text-[11px] sm:text-sm truncate">{card.label}</span>
          </div>
          {card.key === 'best_day' && allTimeStats.best_day ? (
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-neutral-500 mb-0.5 sm:mb-1 truncate">{formatDayLabel(allTimeStats.best_day.date)}</div>
              <div className="text-lg sm:text-2xl font-bold truncate" style={{ color: 'rgb(var(--win-color-rgb))' }}>{formatMoney(allTimeStats.best_day.pnl)}</div>
            </div>
          ) : card.key === 'worst_day' && allTimeStats.worst_day ? (
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-neutral-500 mb-0.5 sm:mb-1 truncate">{formatDayLabel(allTimeStats.worst_day.date)}</div>
              <div className="text-lg sm:text-2xl font-bold truncate" style={{ color: 'rgb(var(--loss-color-rgb))' }}>{formatMoney(allTimeStats.worst_day.pnl)}</div>
            </div>
          ) : (
            <div className={`text-lg sm:text-2xl font-bold truncate`} style={getValueColor(card)}>
              {getValue(card)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
