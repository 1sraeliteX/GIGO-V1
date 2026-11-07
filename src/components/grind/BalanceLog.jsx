import { useMemo, useState } from 'react';
import { fmtMoney, resultStyle } from './shared';
import { exportGrindCSV, exportGrindExcel } from '../../services/grindExport';

const PAGE_SIZE = 100;

export default function BalanceLog({ report }) {
  const [chronological, setChronological] = useState(false);
  const [page, setPage] = useState(0);
  const { log, stats } = report;

  const entries = useMemo(() => {
    if (!chronological) return log;
    return [...log].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.n - b.n);
  }, [log, chronological]);

  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = entries.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const summary = [
    ['Final balance', fmtMoney(stats.final_balance)],
    ['Net profit', `${stats.net_profit >= 0 ? '+' : ''}${fmtMoney(stats.net_profit)}`],
    ['Total return', `${stats.total_return_pct}%`],
    ['Peak balance', fmtMoney(stats.peak_balance)],
    ['Lowest balance', fmtMoney(stats.lowest_balance)],
    ['Wins', stats.wins],
    ['Losses', stats.losses],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {summary.map(([label, value]) => (
          <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
            <div className="text-[10px] text-neutral-500">{label}</div>
            <div className="text-sm font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
          <input type="checkbox" checked={chronological} onChange={e => { setChronological(e.target.checked); setPage(0); }}
            className="accent-emerald-500" />
          Chronological
        </label>
        <div className="flex-1" />
        <button onClick={() => exportGrindCSV(report)}
          className="text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-1.5 transition-colors">
          Export CSV
        </button>
        <button onClick={() => exportGrindExcel(report)}
          className="text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-1.5 transition-colors">
          Export Excel
        </button>
      </div>

      <div className="overflow-auto max-h-[60vh] rounded-lg border border-neutral-800">
        <table className="w-full border-collapse whitespace-nowrap text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-neutral-900 text-neutral-400">
              {['Trade #', 'Market row', 'Column', 'Result', 'P/L ($)', 'Balance ($)', 'Date'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium border-b border-neutral-800">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map(e => (
              <tr key={e.n} className="border-b border-neutral-800/60 text-neutral-300">
                <td className="px-3 py-1.5">{e.n}</td>
                <td className="px-3 py-1.5">{e.market ? `${e.row} · ${e.market}` : 'Start balance'}</td>
                <td className="px-3 py-1.5">{e.col || '—'}</td>
                <td className="px-1 py-1">
                  {e.result ? <span className="inline-block w-6 text-center rounded font-semibold" style={resultStyle(e.result)}>{e.result}</span> : ''}
                </td>
                <td className="px-3 py-1.5" style={{ color: e.pnl > 0 ? 'var(--win-color)' : e.pnl < 0 ? 'var(--loss-color)' : undefined }}>
                  {e.n === 0 ? '—' : `${e.pnl >= 0 ? '+' : ''}${fmtMoney(e.pnl)}`}
                </td>
                <td className="px-3 py-1.5 text-white">{fmtMoney(e.balance)}</td>
                <td className="px-3 py-1.5 text-neutral-500">{e.date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 transition-colors">
            Previous
          </button>
          <span>Page {safePage + 1} of {pages} · {entries.length} entries</span>
          <button disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}