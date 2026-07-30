import { useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarGrid({ year, month, trades, onDayClick, onPrevMonth, onNextMonth, accountCapital }) {
  const { formatMoneyCompact } = useCurrency();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { grid, monthLabel } = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const cells = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = month === 1 ? 12 : month - 1;
      const y = month === 1 ? year - 1 : year;
      cells.push({ day, month: m, year: y, isCurrentMonth: false, date: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, month, year, isCurrentMonth: true, date: dateStr });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 12 ? 1 : month + 1;
      const y = month === 12 ? year + 1 : year;
      cells.push({ day: d, month: m, year: y, isCurrentMonth: false, date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }

    return { grid: cells, monthLabel };
  }, [year, month]);

  const dayStats = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      const d = t.trade_date;
      if (!map[d]) map[d] = { pnl: 0, count: 0 };
      map[d].pnl += parseFloat(t.pnl_amount);
      map[d].count += 1;
    });
    Object.values(map).forEach((s) => {
      s.pct = accountCapital > 0 ? (s.pnl / accountCapital) * 100 : null;
    });
    return map;
  }, [trades, accountCapital]);

  const getCellStyle = (cell) => {
    const stats = dayStats[cell.date];
    if (!stats || !cell.isCurrentMonth) return null;
    if (stats.pnl > 0) return `rgb(var(--win-color-rgb))`;
    if (stats.pnl < 0) return `rgb(var(--loss-color-rgb))`;
    return null;
  };

  const getAmountColor = (cell) => {
    const stats = dayStats[cell.date];
    if (!stats) return '';
    if (stats.pnl > 0) return 'text-white';
    if (stats.pnl < 0) return 'text-white';
    return 'text-neutral-400';
  };

  const formatDayValue = (stats) => {
    if (stats.pct !== null) {
      const r = Math.round(stats.pct * 10) / 10;
      if (r > 0) return `+${r}%`;
      if (r < 0) return `${r}%`;
    }
    return formatMoneyCompact(stats.pnl);
  };

  return (
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-2 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button onClick={onPrevMonth} className="text-neutral-400 hover:text-white transition-colors p-1.5 sm:p-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-[19px] sm:text-[23px] font-semibold text-white">{monthLabel}</h2>
        <button onClick={onNextMonth} className="text-neutral-400 hover:text-white transition-colors p-1.5 sm:p-2">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px sm:gap-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-neutral-500 text-[10px] sm:text-xs font-medium py-1 sm:py-2">{d}</div>
        ))}
        {grid.map((cell, i) => {
          const stats = dayStats[cell.date];
          const isToday = cell.date === todayStr;
          const cellStyle = getCellStyle(cell);
          return (
            <button
              key={i}
              onClick={() => cell.isCurrentMonth && onDayClick(cell.date)}
              className={`
                relative rounded border sm:rounded-lg border p-0.5 sm:p-2 min-h-[44px] sm:min-h-[72px] text-left transition-colors
                ${cell.isCurrentMonth ? `${cellStyle ? '' : 'bg-neutral-900'} border-white/10 sm:border-white/20 hover:border-white/40` : 'bg-neutral-900/50 border-transparent'}
                ${isToday ? 'ring-1' : ''}
                ${(!stats || !cell.isCurrentMonth) ? 'cursor-default' : 'cursor-pointer'}
              `}
              style={{
                ...(cellStyle ? { backgroundColor: cellStyle } : {}),
                ...(isToday ? { boxShadow: '0 0 0 1px rgb(var(--win-color-rgb))' } : {}),
              }}
            >
              <span className={`text-[10px] sm:text-xs ${cell.isCurrentMonth ? 'text-neutral-300' : 'text-neutral-600'}`}>
                {cell.day}
              </span>
              {stats && cell.isCurrentMonth && (
                <div className={`text-[9px] sm:text-xs font-semibold mt-0.5 sm:mt-1 leading-tight ${getAmountColor(cell)}`}>
                  {formatDayValue(stats)}
                </div>
              )}
              {stats && cell.isCurrentMonth && stats.count > 0 && (
                <div className="hidden sm:block text-[10px] text-white mt-0.5">{stats.count} trade{stats.count !== 1 ? 's' : ''}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
