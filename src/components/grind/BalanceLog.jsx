import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';

const PAGE_SIZE = 100;

function fmt(val) {
  if (val == null) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ResultBadge({ result }) {
  if (!result) return null;
  const cls =
    result === 'W'
      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
      : result === 'L'
      ? 'bg-red-700/20 text-red-400 border border-red-700/40'
      : 'bg-neutral-700/40 text-neutral-400 border border-neutral-600/40';
  return (
    <span className={`inline-flex items-center justify-center w-7 h-6 rounded text-xs font-bold ${cls}`}>
      {result}
    </span>
  );
}

function downloadCSV(rows) {
  const headers = ['Trade #', 'Market', 'Column', 'Result', 'P/L', 'Balance'];
  const lines = [
    headers.join(','),
    ...rows
      .filter((r) => r.trade_num > 0)
      .map((r) =>
        [r.trade_num, r.market, r.col, r.result, r.pnl, r.balance].join(',')
      ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'balance_log.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function BalanceLog({ log, logChrono, startBalance }) {
  const [chrono, setChrono]   = useState(false);
  const [page, setPage]       = useState(1);

  const rows = useMemo(() => (chrono ? logChrono : log) ?? [], [chrono, log, logChrono]);

  const pageRows = useMemo(() => {
    const nonZero = rows.filter((r) => r.trade_num > 0);
    const start = (page - 1) * PAGE_SIZE;
    return nonZero.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const totalNonZero = useMemo(() => rows.filter((r) => r.trade_num > 0).length, [rows]);
  const totalPages   = Math.max(1, Math.ceil(totalNonZero / PAGE_SIZE));

  // Summary from last log entry
  const last = useMemo(() => rows.filter((r) => r.trade_num > 0).at(-1), [rows]);
  const finalBal  = last?.balance ?? startBalance;
  const netProfit = finalBal - startBalance;
  const totalRetPct = startBalance > 0 ? ((netProfit / startBalance) * 100).toFixed(2) : null;
  const allBals   = rows.filter((r) => r.trade_num > 0).map((r) => r.balance);
  const peak      = allBals.length > 0 ? Math.max(startBalance, ...allBals) : startBalance;
  const lowest    = allBals.length > 0 ? Math.min(startBalance, ...allBals) : startBalance;
  const wins      = rows.filter((r) => r.result === 'W').length;
  const losses    = rows.filter((r) => r.result === 'L').length;

  if (rows.length <= 1) {
    return (
      <div className="text-center py-16 text-neutral-500">
        No trades found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary box */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Final Balance', value: `$${fmt(finalBal)}`, color: netProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Net Profit',    value: `${netProfit >= 0 ? '+' : ''}$${fmt(netProfit)}`, color: netProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Total Return',  value: totalRetPct != null ? `${totalRetPct}%` : '—', color: 'text-neutral-300' },
          { label: 'Peak Balance',  value: `$${fmt(peak)}`,    color: 'text-sky-400' },
          { label: 'Lowest Balance',value: `$${fmt(lowest)}`,  color: 'text-amber-400' },
          { label: 'W / L',         value: `${wins} / ${losses}`, color: 'text-neutral-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer select-none">
          <div
            onClick={() => { setChrono((v) => !v); setPage(1); }}
            className={`w-9 h-5 rounded-full transition-colors relative ${chrono ? 'bg-emerald-600' : 'bg-neutral-700'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${chrono ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          Chronological order
        </label>
        <button
          onClick={() => downloadCSV(rows)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg transition-colors border border-neutral-700"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-900 text-neutral-400 font-semibold">
              {['Trade #', 'Market', 'Col', 'Result', 'P/L ($)', 'Balance ($)'].map((h) => (
                <th key={h} className="border border-neutral-800 px-3 py-2 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const pnlNum = typeof row.pnl === 'string' ? parseFloat(row.pnl) : row.pnl;
              return (
                <tr key={`${row.trade_num}-${row.trade_id ?? ''}`} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="border border-neutral-800 px-3 py-1.5 text-neutral-400">{row.trade_num}</td>
                  <td className="border border-neutral-800 px-3 py-1.5 text-white font-medium">{row.market}</td>
                  <td className="border border-neutral-800 px-3 py-1.5 text-neutral-400">{row.col}</td>
                  <td className="border border-neutral-800 px-3 py-1.5">
                    <ResultBadge result={row.result} />
                  </td>
                  <td className={`border border-neutral-800 px-3 py-1.5 font-mono font-semibold ${pnlNum > 0 ? 'text-emerald-400' : pnlNum < 0 ? 'text-red-400' : 'text-neutral-500'}`}>
                    {pnlNum >= 0 ? '+' : ''}{fmt(pnlNum)}
                  </td>
                  <td className="border border-neutral-800 px-3 py-1.5 font-mono text-white">
                    {fmt(row.balance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm text-neutral-400">
          <span>Page {page} of {totalPages} ({totalNonZero} trades)</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
