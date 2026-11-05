import { useMemo } from 'react';

const CELL_W = 28;

function ResultCell({ result }) {
  if (result === undefined || result === null || result === '') {
    return <td style={{ minWidth: CELL_W, width: CELL_W }} className="border border-neutral-800" />;
  }
  const cls =
    result === 'W'
      ? 'bg-emerald-600/80 text-emerald-100 font-bold'
      : result === 'L'
      ? 'bg-red-700/80 text-red-100 font-bold'
      : 'bg-neutral-600/60 text-neutral-300 font-semibold'; // B = breakeven
  return (
    <td
      style={{ minWidth: CELL_W, width: CELL_W, height: CELL_W }}
      className={`text-center text-[10px] border border-neutral-800 ${cls}`}
    >
      {result}
    </td>
  );
}

export default function GrindTable({ markets }) {
  const maxCols = useMemo(
    () => Math.max(0, ...markets.map((m) => m.trades.length)),
    [markets]
  );

  if (markets.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500">
        No trades found. Add trades to see the Grind Table.
      </div>
    );
  }

  // Footer totals
  const totalWins   = markets.reduce((s, m) => s + (m.wins   ?? 0), 0);
  const totalLosses = markets.reduce((s, m) => s + (m.losses ?? 0), 0);
  const totalBreaks = markets.reduce((s, m) => s + (m.breakeven ?? 0), 0);
  const totalTrades = totalWins + totalLosses + totalBreaks;
  const overallWinPct =
    totalWins + totalLosses > 0
      ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)
      : '—';

  const colHeaders = Array.from({ length: maxCols }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="sticky top-0 z-20 bg-neutral-900">
            {/* Row # */}
            <th
              className="sticky left-0 z-30 bg-neutral-900 border border-neutral-700 px-2 text-neutral-400 font-semibold text-center"
              style={{ minWidth: 36, width: 36, height: CELL_W }}
            >
              #
            </th>
            {/* Market */}
            <th
              className="sticky left-9 z-30 bg-neutral-900 border border-neutral-700 px-2 text-left text-neutral-400 font-semibold whitespace-nowrap"
              style={{ minWidth: 100, width: 100, height: CELL_W }}
            >
              Market
            </th>
            {/* Trade columns */}
            {colHeaders.map((n) => (
              <th
                key={n}
                className="border border-neutral-800 text-center text-neutral-500 font-normal"
                style={{ minWidth: CELL_W, width: CELL_W, height: CELL_W }}
              >
                {n}
              </th>
            ))}
            {/* Summary */}
            <th className="border border-neutral-800 px-2 text-neutral-400 font-semibold text-center whitespace-nowrap" style={{ minWidth: 44 }}>W</th>
            <th className="border border-neutral-800 px-2 text-neutral-400 font-semibold text-center whitespace-nowrap" style={{ minWidth: 44 }}>L</th>
            <th className="border border-neutral-800 px-2 text-neutral-400 font-semibold text-center whitespace-nowrap" style={{ minWidth: 60 }}>W%</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market, rowIdx) => (
            <tr key={market.name} className="hover:bg-neutral-800/30 transition-colors">
              {/* Row # */}
              <td
                className="sticky left-0 z-10 bg-neutral-900 border border-neutral-700 text-center text-neutral-500"
                style={{ minWidth: 36, width: 36 }}
              >
                {rowIdx + 1}
              </td>
              {/* Market name */}
              <td
                className="sticky left-9 z-10 bg-neutral-900 border border-neutral-700 px-2 text-white font-medium whitespace-nowrap"
                style={{ minWidth: 100, width: 100 }}
              >
                {market.name}
              </td>
              {/* Trade cells */}
              {colHeaders.map((n) => {
                const trade = market.trades[n - 1];
                return <ResultCell key={n} result={trade?.result} />;
              })}
              {/* Wins */}
              <td className="border border-neutral-800 text-center text-emerald-400 font-semibold">
                {market.wins ?? 0}
              </td>
              {/* Losses */}
              <td className="border border-neutral-800 text-center text-red-400 font-semibold">
                {market.losses ?? 0}
              </td>
              {/* Win % */}
              <td className="border border-neutral-800 text-center text-neutral-300">
                {market.win_pct != null ? `${market.win_pct}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-neutral-800/60 font-semibold text-neutral-300">
            <td
              colSpan={2}
              className="sticky left-0 z-10 bg-neutral-800 border border-neutral-700 px-2 text-white"
              style={{ minWidth: 136 }}
            >
              Totals
            </td>
            {/* Empty cells under trade columns */}
            {colHeaders.map((n) => (
              <td key={n} className="border border-neutral-800" style={{ minWidth: CELL_W, width: CELL_W }} />
            ))}
            <td className="border border-neutral-800 text-center text-emerald-400">{totalWins}</td>
            <td className="border border-neutral-800 text-center text-red-400">{totalLosses}</td>
            <td className="border border-neutral-800 text-center">{overallWinPct}{overallWinPct !== '—' ? '%' : ''}</td>
          </tr>
          <tr className="bg-neutral-800/40 text-xs text-neutral-500">
            <td colSpan={2 + maxCols} className="sticky left-0 bg-neutral-900 border border-neutral-800 px-3 py-1">
              {totalTrades} total trades · {totalWins} W · {totalLosses} L{totalBreaks > 0 ? ` · ${totalBreaks} B` : ''}
            </td>
            <td colSpan={3} className="border border-neutral-800" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
