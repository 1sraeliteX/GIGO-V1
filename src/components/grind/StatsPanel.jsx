import { useState } from 'react';
import { TrendingUp, TrendingDown, Zap, Award, AlertTriangle, Search } from 'lucide-react';

function fmt(val, decimals = 2) {
  if (val == null) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-4 flex items-start gap-3">
      <div className={`mt-0.5 p-2 rounded-lg bg-neutral-700/50 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
        <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
        {sub && <p className="text-xs text-neutral-500 mt-0.5 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

function StreakList({ title, items, type }) {
  const color = type === 'loss' ? 'text-red-400' : 'text-emerald-400';
  const badge = type === 'loss' ? 'bg-red-700/20 text-red-400 border border-red-700/30' : 'bg-emerald-700/20 text-emerald-400 border border-emerald-700/30';

  if (!items || items.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-neutral-400 mb-2">{title}</h4>
      <div className="space-y-1.5">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 bg-neutral-800/40 rounded-lg px-3 py-2 border border-neutral-700/40">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${badge}`}>
                {item.length}
              </span>
              <span className="text-xs text-white font-medium truncate">{item.market}</span>
            </div>
            <span className="text-xs text-neutral-500 whitespace-nowrap shrink-0">
              trades {item.start}–{item.end}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsPanel({ stats, startBalance }) {
  const [lookupN, setLookupN]     = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  if (!stats || stats.total === 0) {
    return (
      <div className="text-center py-16 text-neutral-500">No trades to show stats for.</div>
    );
  }

  const netProfit = typeof stats.net_profit === 'string' ? parseFloat(stats.net_profit) : (stats.net_profit ?? 0);

  // Balance at trade N lookup (uses the log if passed, but stats only holds summary here)
  // We pass log via context in GrindReport and expose a lookup; for now show form + message
  const handleLookup = (log) => {
    const n = parseInt(lookupN, 10);
    if (isNaN(n) || n < 0) return;
    if (!log || log.length === 0) return;
    if (n === 0) {
      setLookupResult({ balance: startBalance, wins: 0, losses: 0, pnl: 0, trade_num: 0 });
      return;
    }
    const entry = log.find((e) => e.trade_num === n);
    if (!entry) {
      // find closest
      const all = log.filter((e) => e.trade_num > 0);
      const last = all[all.length - 1];
      setLookupResult(last ? { ...last, notExact: true } : null);
      return;
    }
    // Count W/L up to this trade
    const subset = log.filter((e) => e.trade_num > 0 && e.trade_num <= n);
    const wins   = subset.filter((e) => e.result === 'W').length;
    const losses = subset.filter((e) => e.result === 'L').length;
    const pnl    = entry.balance - startBalance;
    setLookupResult({ balance: entry.balance, wins, losses, pnl, trade_num: n });
  };

  return (
    <div className="space-y-6">
      {/* Primary stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Win Rate"
          value={stats.win_rate != null ? `${stats.win_rate}%` : '—'}
          sub={`${stats.wins} W · ${stats.losses} L · ${stats.breakeven ?? 0} B of ${stats.total} trades`}
          color="text-emerald-400"
        />
        <StatCard
          icon={Award}
          label="Final Balance"
          value={`$${fmt(stats.final_balance)}`}
          sub={`Net ${netProfit >= 0 ? '+' : ''}$${fmt(netProfit)} · ${stats.total_return_pct != null ? stats.total_return_pct + '%' : '—'} return`}
          color={netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Max Drawdown"
          value={`$${fmt(stats.max_drawdown_abs)}`}
          sub={`${stats.max_drawdown_pct != null ? stats.max_drawdown_pct + '%' : '—'} from peak · Peak $${fmt(stats.peak_balance)} · Low $${fmt(stats.lowest_balance)}`}
          color="text-orange-400"
        />
        <StatCard
          icon={Zap}
          label="Longest Winning Streak"
          value={stats.longest_win_streak ?? 0}
          sub="consecutive wins"
          color="text-sky-400"
        />
        <StatCard
          icon={TrendingDown}
          label="Longest Losing Streak"
          value={stats.longest_loss_streak ?? 0}
          sub="consecutive losses"
          color="text-red-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Peak Balance"
          value={`$${fmt(stats.peak_balance)}`}
          sub={`Lowest: $${fmt(stats.lowest_balance)}`}
          color="text-sky-400"
        />
      </div>

      {/* Per-market streaks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" /> Longest Losing Streaks by Market
          </h3>
          <StreakList
            title="Top markets by worst losing run"
            items={stats.longest_loss_per_market}
            type="loss"
          />
          {(!stats.longest_loss_per_market || stats.longest_loss_per_market.length === 0) && (
            <p className="text-xs text-neutral-500">No losing streaks found.</p>
          )}
        </div>
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Longest Winning Streaks by Market
          </h3>
          <StreakList
            title="Top markets by best winning run"
            items={stats.longest_win_per_market}
            type="win"
          />
          {(!stats.longest_win_per_market || stats.longest_win_per_market.length === 0) && (
            <p className="text-xs text-neutral-500">No winning streaks found.</p>
          )}
        </div>
      </div>

      {/* Balance at Trade N lookup — parent must pass log via prop */}
      <LookupPanel startBalance={startBalance} />
    </div>
  );
}

// Separate sub-component so parent (GrindReport) passes log via callback
export function LookupPanel({ log, startBalance }) {
  const [n, setN] = useState('');
  const [result, setResult] = useState(null);

  const lookup = () => {
    const num = parseInt(n, 10);
    if (isNaN(num) || num < 0 || !log) return;
    if (num === 0) {
      setResult({ balance: startBalance, wins: 0, losses: 0, pnl: 0, trade_num: 0, notExact: false });
      return;
    }
    const entry = log.find((e) => e.trade_num === num);
    const subset = (log ?? []).filter((e) => e.trade_num > 0 && e.trade_num <= (entry?.trade_num ?? num));
    const wins   = subset.filter((e) => e.result === 'W').length;
    const losses = subset.filter((e) => e.result === 'L').length;
    const bal    = entry?.balance ?? startBalance;
    const pnl    = bal - startBalance;
    setResult({ balance: bal, wins, losses, pnl, trade_num: entry?.trade_num ?? num, notExact: !entry });
  };

  return (
    <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-neutral-400" /> Balance at Trade N
      </h3>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          value={n}
          onChange={(e) => { setN(e.target.value); setResult(null); }}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="Enter trade number…"
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={lookup}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Look up
        </button>
      </div>
      {result && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: `Balance (trade ${result.trade_num}${result.notExact ? '*' : ''})`, value: `$${(typeof result.balance === 'string' ? parseFloat(result.balance) : result.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Net P/L',  value: `${(result.pnl >= 0 ? '+' : '')}$${Math.abs(result.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Wins',     value: result.wins },
            { label: 'Losses',   value: result.losses },
          ].map(({ label, value }) => (
            <div key={label} className="bg-neutral-800 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-neutral-500 mb-0.5">{label}</p>
              <p className="text-sm font-bold text-white font-mono">{value}</p>
            </div>
          ))}
          {result.notExact && (
            <p className="col-span-full text-[10px] text-neutral-500">
              * Trade #{n} not found — showing closest available trade.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
