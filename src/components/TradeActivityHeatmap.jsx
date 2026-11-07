import { useMemo, useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LABELED_WEEKDAYS = [0, 2, 4];
const LEVELS = 4;

const PALETTES = {
  dark: ['#262626', '#0e4429', '#006d32', '#26a641', '#39d353'],
  light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function endOfWeek(date) {
  return addDays(date, 6 - ((date.getDay() + 6) % 7));
}

function resolvePalette(colorScheme, theme) {
  const base = PALETTES[theme === 'light' ? 'light' : 'dark'];

  if (Array.isArray(colorScheme)) {
    if (colorScheme.length >= 5) return colorScheme.slice(0, 5);
    if (colorScheme.length === LEVELS) return [base[0], ...colorScheme];
  }

  if (colorScheme && typeof colorScheme === 'object' && !Array.isArray(colorScheme)) {
    const levels = Array.from({ length: 5 }, (_, i) => colorScheme[i]);
    if (levels.every(Boolean)) return levels;
  }

  return base;
}

export default function TradeActivityHeatmap({
  data = [],
  startDate,
  endDate,
  colorScheme = 'green',
  onDayClick,
  loading = false,
  cellSize = 11,
  gap = 3,
  title = 'Trading activity',
  className = '',
}) {
  const { theme } = useTheme();
  const { formatMoney } = useCurrency();
  const [tooltip, setTooltip] = useState(null);

  const palette = resolvePalette(colorScheme, theme);

  const { weeks, monthLabels, maxCount, totalTrades, activeDays } = useMemo(() => {
    const end = endDate ? parseKey(endDate) : startOfDay(new Date());
    const start = startDate ? parseKey(startDate) : addDays(end, -364);

    const statsByDate = new Map();
    (data || []).forEach((day) => {
      if (!day?.date) return;
      const count = Number(day.count) || 0;
      const netPnL = Number(day.netPnL ?? day.net_pnl) || 0;
      const wins = Number(day.wins) || 0;
      const losses = Number(day.losses) || 0;
      const existing = statsByDate.get(day.date);
      statsByDate.set(day.date, {
        date: day.date,
        count: (existing?.count || 0) + count,
        netPnL: (existing?.netPnL || 0) + netPnL,
        wins: (existing?.wins || 0) + wins,
        losses: (existing?.losses || 0) + losses,
      });
    });

    const gridStart = startOfWeek(start);
    const gridEnd = endOfWeek(end);
    const builtWeeks = [];
    const labels = [];
    let max = 0;
    let total = 0;
    let active = 0;

    for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 7)) {
      const days = [];
      for (let offset = 0; offset < 7; offset++) {
        const date = addDays(cursor, offset);
        const key = toKey(date);
        const inRange = date >= start && date <= end;
        const stats = inRange ? statsByDate.get(key) || null : null;

        if (stats) {
          if (stats.count > max) max = stats.count;
          if (stats.count > 0) {
            total += stats.count;
            active += 1;
          }
        }

        days.push({ key, date, inRange, stats });
      }

      const monthStart = days.find((day) => day.inRange && day.date.getDate() === 1);
      const firstInRange = days.find((day) => day.inRange);
      if (monthStart) {
        labels.push(MONTHS[monthStart.date.getMonth()]);
      } else if (builtWeeks.length === 0 && firstInRange) {
        labels.push(MONTHS[firstInRange.date.getMonth()]);
      } else {
        labels.push('');
      }

      builtWeeks.push(days);
    }

    return { weeks: builtWeeks, monthLabels: labels, maxCount: max, totalTrades: total, activeDays: active };
  }, [data, startDate, endDate]);

  const levelFor = (count) => {
    if (!count || count < 1) return 0;
    if (maxCount < 1) return 0;
    return Math.min(LEVELS, Math.ceil((count / maxCount) * LEVELS));
  };

  const showTooltip = (day, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + rect.width / 2, 100), window.innerWidth - 100);
    const above = rect.top > 120;
    setTooltip({
      day,
      x,
      y: above ? rect.top - 6 : rect.bottom + 6,
      above,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const handleDayClick = (day) => {
    if (onDayClick && day.stats?.count > 0) {
      setTooltip(null);
      onDayClick(day.key);
    }
  };

  const tooltipDay = tooltip?.day;
  const tooltipStats = tooltipDay?.stats;
  const tooltipOutcome = tooltipStats ? tooltipStats.wins + tooltipStats.losses : 0;
  const tooltipWinRate = tooltipOutcome > 0 ? Math.round((tooltipStats.wins / tooltipOutcome) * 100) : 0;

  return (
    <div className={`bg-neutral-900 rounded-xl border border-neutral-800 p-3 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[19px] sm:text-[23px] font-semibold text-white">{title}</h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            {totalTrades} trade{totalTrades === 1 ? '' : 's'} across {activeDays} active day{activeDays === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <span>Less</span>
          {palette.map((color, index) => (
            <span
              key={index}
              className="rounded-[2px] border border-white/5"
              style={{ width: cellSize, height: cellSize, backgroundColor: color }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-lg bg-neutral-800/60" style={{ height: cellSize * 7 + gap * 6 + 24 }} />
      ) : (
        <div className="overflow-x-auto pb-1" onScroll={hideTooltip}>
          <div className="min-w-max">
            <div className="flex mb-1" style={{ gap }}>
              <div style={{ width: 24 }} />
              {weeks.map((_, weekIndex) => (
                <div key={weekIndex} className="relative" style={{ width: cellSize, height: 14 }}>
                  {monthLabels[weekIndex] && (
                    <span className="absolute left-0 top-0 text-[10px] leading-none text-neutral-500 whitespace-nowrap">
                      {monthLabels[weekIndex]}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap }}>
              <div className="flex flex-col" style={{ width: 24, gap }}>
                {WEEKDAYS.map((weekday, index) => (
                  <div
                    key={weekday}
                    className="flex items-center justify-end pr-0.5 text-[10px] leading-none text-neutral-500"
                    style={{ height: cellSize }}
                  >
                    {LABELED_WEEKDAYS.includes(index) ? weekday : ''}
                  </div>
                ))}
              </div>

              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col" style={{ gap }}>
                  {week.map((day) => {
                    if (!day.inRange) {
                      return <div key={day.key} style={{ width: cellSize, height: cellSize }} />;
                    }

                    const count = day.stats?.count || 0;
                    const level = levelFor(count);
                    const clickable = Boolean(onDayClick) && count > 0;
                    const dateLabel = day.date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={(event) => showTooltip(day, event)}
                        onMouseLeave={hideTooltip}
                        onFocus={(event) => showTooltip(day, event)}
                        onBlur={hideTooltip}
                        aria-label={`${dateLabel}: ${count} trade${count === 1 ? '' : 's'}`}
                        className={`rounded-[2px] border border-white/5 outline-none transition-all ${
                          clickable ? 'cursor-pointer hover:ring-1 hover:ring-white/50' : 'cursor-default'
                        }`}
                        style={{ width: cellSize, height: cellSize, backgroundColor: palette[level] }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tooltip && tooltipDay && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          <div className="min-w-[160px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs text-neutral-300 shadow-xl">
            <div className="mb-1 font-semibold text-white">
              {tooltipDay.date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            {tooltipStats ? (
              <>
                <div>
                  {tooltipStats.count} trade{tooltipStats.count === 1 ? '' : 's'}
                </div>
                <div
                  className={
                    tooltipStats.netPnL > 0
                      ? 'text-emerald-400'
                      : tooltipStats.netPnL < 0
                        ? 'text-red-400'
                        : 'text-neutral-400'
                  }
                >
                  Net P&amp;L: {formatMoney(tooltipStats.netPnL)}
                </div>
                <div className="text-neutral-400">
                  {tooltipStats.wins}W · {tooltipStats.losses}L
                  {tooltipOutcome > 0 ? ` · ${tooltipWinRate}% win rate` : ''}
                </div>
              </>
            ) : (
              <div className="text-neutral-500">No trades</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
