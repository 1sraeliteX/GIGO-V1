import { cellClass, headClass, resultStyle, fmtMoney } from './shared';

export default function BalanceGrid({ report }) {
  const { markets, stats } = report;
  const maxLen = Math.max(0, ...markets.map(m => m.balances.length));

  if (markets.length === 0) {
    return <p className="text-sm text-neutral-500 py-8 text-center">No trades yet.</p>;
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
            <th className={`${headClass} min-w-[80px]`}>End balance</th>
            <th className={`${headClass} min-w-[70px]`}>Net P/L</th>
          </tr>
        </thead>
        <tbody>
          {markets.map(m => (
            <tr key={m.name}>
              <td className={`${cellClass} sticky left-0 z-10 bg-neutral-900 text-neutral-400`}>{m.row}</td>
              <td className={`${cellClass} sticky left-[36px] z-10 bg-neutral-900 text-left text-neutral-300`}>{m.name}</td>
              {Array.from({ length: maxLen }, (_, i) => {
                const b = m.balances[i];
                return (
                  <td key={i} className={`${cellClass} min-w-[64px]`} style={b ? resultStyle(b.result) : {}}>
                    {b ? fmtMoney(b.balance) : ''}
                  </td>
                );
              })}
              <td className={`${cellClass} text-neutral-200`}>{fmtMoney(m.end_balance)}</td>
              <td className={cellClass} style={{ color: m.net_pnl >= 0 ? 'var(--win-color)' : 'var(--loss-color)' }}>
                {m.net_pnl >= 0 ? '+' : ''}{fmtMoney(m.net_pnl)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-20">
          <tr>
            <td className={`${cellClass} sticky left-0 z-30 bg-neutral-900`}></td>
            <td className={`${cellClass} sticky left-[36px] z-30 bg-neutral-900 text-left text-neutral-300`}>Summary</td>
            <td className={`${cellClass} text-neutral-300`} colSpan={maxLen}>
              Final {fmtMoney(stats.final_balance)} · Peak {fmtMoney(stats.peak_balance)} · Lowest {fmtMoney(stats.lowest_balance)}
            </td>
            <td className={`${cellClass} text-neutral-200`}>{fmtMoney(stats.final_balance)}</td>
            <td className={cellClass} style={{ color: stats.net_profit >= 0 ? 'var(--win-color)' : 'var(--loss-color)' }}>
              {stats.net_profit >= 0 ? '+' : ''}{fmtMoney(stats.net_profit)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}