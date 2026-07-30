import { X, Edit2, Trash2, Plus } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

function calcDayPct(trades, capital) {
  if (!capital || capital <= 0) return null;
  const pnl = trades.reduce((s, t) => s + parseFloat(t.pnl_amount), 0);
  const pct = (pnl / capital) * 100;
  const r = Math.round(pct * 10) / 10;
  if (r > 0) return `+${r}%`;
  if (r < 0) return `${r}%`;
  return null;
}

export default function DayDetail({ date, trades, maxPerDay, onClose, onEdit, onDelete, onAddTrade, accountCapital }) {
  const { formatMoney, formatMoneyCompact, currency } = useCurrency();
  if (!date) return null;

  const calcTradePct = (trade) => {
    if (trade.risk_type !== 'amount') return null;
    const risk = parseFloat(trade.risk_value);
    if (risk <= 0) return null;
    const pnl = parseFloat(trade.pnl_amount);
    const target = trade.target_amount ? parseFloat(trade.target_amount) : null;
    const base = target && target > 0 ? target : risk;
    const pct = (pnl / base) * 100;
    const r = Math.round(pct * 10) / 10;
    if (r > 0) return `+${r}%`;
    if (r < 0) return `${r}%`;
    return '0%';
  };

  const dayTotal = trades.reduce((sum, t) => sum + parseFloat(t.pnl_amount), 0);
  const dayPctText = calcDayPct(trades, accountCapital);
  const dayTotalDisplay = dayPctText || formatMoneyCompact(dayTotal);
  const atLimit = maxPerDay ? trades.length >= maxPerDay : false;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-white truncate">{date}</h2>
            {trades.length > 0 && (
              <span className="text-xs sm:text-sm font-medium" style={{ color: dayTotal >= 0 ? 'rgb(var(--win-color-rgb))' : 'rgb(var(--loss-color-rgb))' }}>
                Day total: {dayTotalDisplay}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {trades.length === 0 && (
          <div className="p-6 sm:p-8 text-center">
            <p className="text-neutral-500 mb-6">No trades recorded for this day.</p>
            <button
              onClick={() => onAddTrade(date)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Add Trade
            </button>
          </div>
        )}

        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {trades.length > 0 && (
            <div className="text-[10px] sm:text-xs text-neutral-500 px-1 mb-1 sm:mb-2">
              {trades.length}{maxPerDay ? `/${maxPerDay}` : ''} trades today
            </div>
          )}
          {trades.map((trade) => (
            <div key={trade.id} className="bg-neutral-800 rounded-lg border border-neutral-700 p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <span className="text-white font-medium text-sm sm:text-base">{trade.pair}</span>
                  <span className={`ml-1.5 sm:ml-2 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full`}
                    style={{
                      backgroundColor: trade.result === 'win' ? 'rgb(var(--win-color-rgb) / 0.15)' : 'rgb(var(--loss-color-rgb) / 0.15)',
                      color: trade.result === 'win' ? 'rgb(var(--win-color-rgb))' : 'rgb(var(--loss-color-rgb))',
                    }}>
                    {trade.result.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-0.5 sm:gap-1 shrink-0">
                  <button onClick={() => onEdit(trade)} className="p-1 sm:p-1.5 text-neutral-400 hover:text-white transition-colors rounded hover:bg-neutral-700">
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button onClick={() => onDelete(trade.id)} className="p-1 sm:p-1.5 text-neutral-400 hover:text-red-400 transition-colors rounded hover:bg-neutral-700">
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <div className="min-w-0"><span className="text-neutral-500">Market:</span> <span className="text-neutral-300 capitalize">{trade.market_type}</span></div>
                <div className="min-w-0"><span className="text-neutral-500">Lot:</span> <span className="text-neutral-300">{trade.lot_size}</span></div>
                <div className="min-w-0"><span className="text-neutral-500">Risk:</span> <span className="text-neutral-300">{trade.risk_type === 'amount' ? currency.symbol : ''}{trade.risk_value}{trade.risk_type === 'percentage' ? '%' : ''}</span></div>
                <div className="min-w-0"><span className="text-neutral-500">Profit Target:</span> <span className="text-neutral-300">{trade.target_amount ? formatMoneyCompact(trade.target_amount) : '-'}</span></div>
              </div>
              <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-semibold" style={{ color: trade.result === 'win' ? 'rgb(var(--win-color-rgb))' : 'rgb(var(--loss-color-rgb))' }}>
                  {formatMoney(trade.pnl_amount)}
                </span>
                {calcTradePct(trade) && (
                  <span className="text-[10px] sm:text-xs font-medium" style={{ color: trade.result === 'win' ? 'rgb(var(--win-color-rgb) / 0.7)' : 'rgb(var(--loss-color-rgb) / 0.7)' }}>
                    {calcTradePct(trade)}
                  </span>
                )}
              </div>
              {trade.notes && (
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-neutral-400 border-t border-neutral-700 pt-1.5 sm:pt-2">{trade.notes}</p>
              )}
            </div>
          ))}
        </div>

        {trades.length > 0 && !atLimit && (
          <div className="p-3 sm:p-4 border-t border-neutral-800">
            <button
              onClick={() => onAddTrade(date)}
              className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-colors border border-neutral-700"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Add Another Trade
            </button>
          </div>
        )}

        {atLimit && (
          <div className="p-3 sm:p-4 border-t border-neutral-800">
            <p className="text-center text-xs sm:text-sm text-amber-400">
              Daily trade limit reached ({trades.length}/{maxPerDay}). Adjust your limit in settings to add more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
