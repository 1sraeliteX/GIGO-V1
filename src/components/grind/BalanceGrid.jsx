import { useMemo } from 'react';

const CELL_W = 76; // wider than grind table since we show dollar amounts

function fmt(val) {
  if (val == null) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BalanceCell({ cell }) {
  if (!cell) {
    return (
      <td style={{ minWidth: CELL_W, width: CELL_W }} className="border border-neutral-800" />
    );
  }
  const { result, balance } = cell;
  const cls =
    result === 'W'
      ? 'bg-emerald-700/40 text-emerald-200'
      : result === 'L'
      ? 'bg-red-800/40 text-red-200'
      : 'bg-neutral-700/30 text-neutral-300';
  return (
    <td
      style={{ minWidth: CELL_W, width: CELL_W, height: 32 }}
      className={`text-center text-[10px] font-mono border border-neutral-800 ${cls}`}
    >
      {fmt(balance)}
    </td>
  );
}

export default function BalanceGrid({ grid, startBalance, stats }) {
  const maxCols = useMemo(
    () => Math.max(0, ...grid.map((r) => r.cells.length)),
    [grid]
  );

  if (grid.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500">
        No trades found.
      </div>
    );
  }

  const colHeaders = Array.from({ length: maxCols }, (_, i) => i + 1);
  const finalBal   = stats?.final_balance ?? startBalance;
  const peakBal    = stats?.peak_balance  ?? startBalance;
  const lowestBal  = stats?.lowest_balance ?? startBalance;

  return (
    <div className="space-y-4">
      {/* Footer summary cards */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Final',  value: `$${fmt(finalBal)}`,  cls: 'text-emerald-400' },
          { label: 'Peak',   value: `$${fmt(peakBal)}`,   cls: 'text-sky-400' },
          { label: 'Lowest', value: `$${fmt(lowestBal)}`, cls: 'text-amber-400' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 px-4 py-2 text-center min-w-[120px]">
            <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
            <p className={`text-sm font-bold font-mono ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="sticky top-0 z-20 bg-neutral-900">
              {/* # */}
              <th
                className="sticky left-0 z-30 bg-neutral-900 border border-neutral-700 px-2 text-neutral-400 font-semibold text-center"
                style={{ minWidth: 36, width: 36, height: 28 }}
              >
                #
              </th>
              {/* Market */}
              <th
                className="sticky left-9 z-30 bg-neutral-900 border border-neutral-700 px-2 text-left text-neutral-400 font-semibold whitespace-nowrap"
                style={{ minWidth: 100, width: 100, height: 28 }}
              >
                Market
              </th>
              {colHeaders.map((n) => (
                <th
                  key={n}
                  className="border border-neutral-800 text-center text-neutral-500 font-normal"
                  style={{ minWidth: CELL_W, width: CELL_W, height: 28 }}
                >
                  {n}
                </th>
              ))}
              <th className="border border-neutral-800 px-2 text-neutral-400 font-semibold text-center whitespace-nowrap" style={{ minWidth: 90 }}>End Bal</th>
              <th className="border border-neutral-800 px-2 text-neutral-400 font-semibold text-center whitespace-nowrap" style={{ minWidth: 90 }}>Net P/L</th>
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIdx) => {
              const netPnl = typeof row.row_pnl === 'string' ? parseFloat(row.row_pnl) : row.row_pnl;
              return (
                <tr key={row.name} className="hover:bg-neutral-800/20 transition-colors">
                  <td
                    className="sticky left-0 z-10 bg-neutral-900 border border-neutral-700 text-center text-neutral-500"
                    style={{ minWidth: 36, width: 36 }}
                  >
                    {rowIdx + 1}
                  </td>
                  <td
                    className="sticky left-9 z-10 bg-neutral-900 border border-neutral-700 px-2 text-white font-medium whitespace-nowrap"
                    style={{ minWidth: 100, width: 100 }}
                  >
                    {row.name}
                  </td>
                  {colHeaders.map((n) => (
                    <BalanceCell key={n} cell={row.cells[n - 1]} />
                  ))}
                  {/* End balance */}
                  <td className="border border-neutral-800 text-center font-mono text-white font-semibold">
                    ${fmt(row.end_balance)}
                  </td>
                  {/* Row net P/L */}
                  <td className={`border border-neutral-800 text-center font-mono font-semibold ${netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {netPnl >= 0 ? '+' : ''}${fmt(Math.abs(netPnl))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-800/60 font-semibold text-neutral-300">
              <td
                colSpan={2}
                className="sticky left-0 z-10 bg-neutral-800 border border-neutral-700 px-2 text-white"
                style={{ minWidth: 136 }}
              >
                Summary
              </td>
              {colHeaders.map((n) => (
                <td key={n} className="border border-neutral-800" style={{ minWidth: CELL_W, width: CELL_W }} />
              ))}
              <td className="border border-neutral-800 text-center font-mono text-emerald-400">${fmt(finalBal)}</td>
              <td className={`border border-neutral-800 text-center font-mono font-semibold ${(finalBal - startBalance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(finalBal - startBalance) >= 0 ? '+' : ''}${fmt(Math.abs(finalBal - startBalance))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
