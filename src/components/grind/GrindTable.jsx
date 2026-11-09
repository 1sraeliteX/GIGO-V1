import { cellClass, headClass, resultStyle } from './shared';

export default function GrindTable({ report }) {
  const { markets, stats } = report;
  const maxLen = Math.max(0, ...markets.map(m => m.trades.length));

  if (markets.length === 0) {
    return <p className="text-sm text-neutral-500 py-8 text-center">No trades yet. Add trades on the dashboard to build your grind report.</p>;
  }

  return (
    <div className="overflow-auto max-h-[70vh] rounded-lg border border-neutral-800">
      <table className="border-collapse whitespace-nowrap">
        <thead className="sticky top-0 z-20">
          <tr>
            <th className={`${headClass} sticky left-0 z-30 min-w-[36px]`}>#</th>
            <th className={`${headClass} sticky left-[36px] z-30 min-w-[110px] text-left`}>Market</th>
            {Array.from({ length: maxLen }, (_, i) => (
              <th key={i} className={headClass}>{i + 1}</th>
            ))}
            <th className={`${headClass} min-w-[44px]`}>W</th>
            <th className={`${headClass} min-w-[44px]`}>L</th>
            <th className={`${headClass} min-w-[56px]`}>Win %</th>
          </tr>
        </thead>
        <tbody>
          {markets.map(m => (
            <tr key={m.name}>
              <td className={`${cellClass} sticky left-0 z-10 bg-neutral-900 text-neutral-400`}>{m.row}</td>
              <td className={`${cellClass} sticky left-[36px] z-10 bg-neutral-900 text-left text-neutral-300`}><span className="block max-w-[180px] truncate" title={m.name}>{m.name}</span></td>
              {Array.from({ length: maxLen }, (_, i) => {
                const t = m.trades[i];
                return (
                  <td key={i} className={cellClass} style={t ? resultStyle(t.result) : {}} title={t ? `${t.date} · trade ${i + 1}` : ''}>
                    {t ? t.result : ''}
                  </td>
                );
              })}
              <td className={cellClass} style={{ color: m.wins > 0 ? 'var(--win-color)' : undefined }}>{m.wins}</td>
              <td className={cellClass} style={{ color: m.losses > 0 ? 'var(--loss-color)' : undefined }}>{m.losses}</td>
              <td className={`${cellClass} text-neutral-300`}>{m.win_pct}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-20">
          <tr>
            <td className={`${cellClass} sticky left-0 z-30 bg-neutral-900`}></td>
            <td className={`${cellClass} sticky left-[36px] z-30 bg-neutral-900 text-left text-neutral-300`}>Total</td>
            <td className={`${cellClass} text-neutral-300`} colSpan={maxLen}>{stats.total_trades} trades</td>
            <td className={`${cellClass}`} style={{ color: 'var(--win-color)' }}>{stats.wins}</td>
            <td className={`${cellClass}`} style={{ color: 'var(--loss-color)' }}>{stats.losses}</td>
            <td className={`${cellClass} text-neutral-300`}>{stats.win_rate}%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}