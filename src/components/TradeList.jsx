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

export default function TradeList({ isOpen, onClose, trades, onEdit, onDelete, onAddTrade, accountCapital }) {
  const { formatMoney, formatMoneyCompact, currency } = useCurrency();
  if (!isOpen) return null;

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

  const groupByDate = {};
  trades.forEach((t) => {
    if (!groupByDate[t.trade_date]) groupByDate[t.trade_date] = [];
    groupByDate[t.trade_date].push(t);
  });

  const sortedDates = Object.keys(groupByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-2xl bg-neutral-900 border-l border-neutral-800 h-full overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-white">All Trades</h2>
            <p className="text-xs sm:text-sm text-neutral-500">{trades.length} trade{trades.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {trades.length === 0 && (
          <div className="p-6 sm:p-8 text-center">
            <p className="text-neutral-500 mb-6">No trades recorded this month.</p>
            <button
              onClick={() => { onClose(); onAddTrade(); }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Trade
            </button>
          </div>
        )}

        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
          {sortedDates.map((date) => {
            const dayTrades = groupByDate[date];
            const dayPnl = dayTrades.reduce((s, t) => s + parseFloat(t.pnl_amount), 0);
            const dayPctText = calcDayPct(dayTrades, accountCapital);
            const dayDisplay = dayPctText || formatMoneyCompact(dayPnl);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1 sm:px-2">
                  <h3 className="text-xs sm:text-sm font-medium text-neutral-400">{date}</h3>
                  <span className="text-[10px] sm:text-xs font-semibold" style={{ color: dayPnl >= 0 ? 'rgb(var(--win-color-rgb))' : 'rgb(var(--loss-color-rgb))' }}>
                    {dayDisplay}
                  </span>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  {dayTrades.map((trade) => (
                    <div key={trade.id} className="bg-neutral-800 rounded-lg border border-neutral-700 p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-white font-medium text-xs sm:text-sm">{trade.pair}</span>
                          <span className={`text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded`}
                            style={{
                              backgroundColor: trade.result === 'win' ? 'rgb(var(--win-color-rgb) / 0.15)' : 'rgb(var(--loss-color-rgb) / 0.15)',
                              color: trade.result === 'win' ? 'rgb(var(--win-color-rgb))' : 'rgb(var(--loss-color-rgb))',
                            }}>
                            {trade.result.toUpperCase()}
                          </span>
                          <span className="text-neutral-500 text-[10px] sm:text-xs capitalize">{trade.market_type}</span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 leading-tight">
                          Lot {trade.lot_size} &middot; Risk {currency.symbol}{trade.risk_value} &middot; Profit Target {trade.target_amount ? formatMoneyCompact(trade.target_amount) : '-'}
                          {trade.notes && <span> &middot; &ldquo;{trade.notes}&rdquo;</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="text-xs sm:text-sm font-semibold" style={{ color: trade.result === 'win' ? 'rgb(var(--win-color-rgb))' : 'rgb(var(--loss-color-rgb))' }}>
                            {formatMoney(trade.pnl_amount)}
                          </span>
                          {calcTradePct(trade) && (
                            <span className="text-[10px] sm:text-xs font-medium" style={{ color: trade.result === 'win' ? 'rgb(var(--win-color-rgb) / 0.7)' : 'rgb(var(--loss-color-rgb) / 0.7)' }}>
                              {calcTradePct(trade)}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-0.5 sm:gap-1 shrink-0">
                          <button onClick={() => { onClose(); onEdit(trade); }} className="p-1 sm:p-1.5 text-neutral-500 hover:text-white transition-colors rounded hover:bg-neutral-700">
                            <Edit2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                          </button>
                          <button onClick={() => onDelete(trade.id)} className="p-1 sm:p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded hover:bg-neutral-700">
                            <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
