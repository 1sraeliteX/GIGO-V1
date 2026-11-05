import { useEffect, useRef, useMemo } from 'react';
import { Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend } from 'chart.js';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend);

function fmt(val) {
  if (val == null) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BalanceChart({ log, settings, stats }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  const { labels, balances, peakIdx, maxDdIdx, marketAt } = useMemo(() => {
    const entries = log ?? [];
    const lbl = [];
    const bal = [];
    const mkt = [];
    let peakVal = -Infinity;
    let peakI   = 0;
    let maxDdVal = 0;
    let maxDdI  = 0;
    let runPeak = -Infinity;

    for (const e of entries) {
      const b = typeof e.balance === 'string' ? parseFloat(e.balance) : e.balance;
      lbl.push(e.trade_num);
      bal.push(b);
      mkt.push(e.market || '');

      if (b > peakVal) { peakVal = b; peakI = lbl.length - 1; }
      if (b > runPeak) runPeak = b;
      const dd = runPeak - b;
      if (dd > maxDdVal) { maxDdVal = dd; maxDdI = lbl.length - 1; }
    }

    return { labels: lbl, balances: bal, peakIdx: peakI, maxDdIdx: maxDdI, marketAt: mkt };
  }, [log]);

  const { startBalance, winAmount, lossAmount } = settings ?? {};

  const title = useMemo(() => {
    const n = (labels.length > 0 ? labels[labels.length - 1] : 0);
    return `Account Balance over ${n} Trade${n !== 1 ? 's' : ''} ($${fmt(startBalance)} start, +$${fmt(winAmount)} W / -$${fmt(lossAmount)} L)`;
  }, [labels, startBalance, winAmount, lossAmount]);

  useEffect(() => {
    if (!canvasRef.current || balances.length === 0) return;

    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvasRef.current.height);
    gradient.addColorStop(0, 'rgba(16,185,129,0.3)');
    gradient.addColorStop(1, 'rgba(16,185,129,0.01)');

    // Peak and max-drawdown annotations as point background colours
    const pointBg = balances.map((_, i) => {
      if (i === peakIdx) return '#38bdf8';    // sky
      if (i === maxDdIdx) return '#f97316';   // orange
      return 'transparent';
    });
    const pointRadius = balances.map((_, i) => (i === peakIdx || i === maxDdIdx ? 6 : 2));
    const pointBorder = balances.map((_, i) => {
      if (i === peakIdx) return '#38bdf8';
      if (i === maxDdIdx) return '#f97316';
      return 'rgba(16,185,129,0.5)';
    });

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Balance',
            data: balances,
            borderColor: '#10b981',
            backgroundColor: gradient,
            fill: true,
            tension: 0.3,
            pointRadius,
            pointBackgroundColor: pointBg,
            pointBorderColor: pointBorder,
            pointBorderWidth: 2,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(23,23,23,0.95)',
            borderColor: '#404040',
            borderWidth: 1,
            titleColor: '#a3a3a3',
            bodyColor: '#ffffff',
            padding: 10,
            callbacks: {
              title: (items) => `Trade #${items[0].label}`,
              label: (item) => {
                const idx  = item.dataIndex;
                const mkt  = marketAt[idx] ?? '';
                const bal  = item.raw;
                const prev = idx > 0 ? balances[idx - 1] : balances[0];
                const diff = bal - prev;
                const sign = diff >= 0 ? '+' : '';
                const extra = idx === peakIdx ? ' ⬆ Peak' : idx === maxDdIdx ? ' ⬇ Max Drawdown' : '';
                return [
                  `Market: ${mkt || '—'}`,
                  `Balance: $${fmt(bal)}`,
                  `Change: ${sign}$${fmt(diff)}${extra}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Trade number', color: '#737373', font: { size: 11 } },
            ticks: { color: '#525252', maxTicksLimit: 20 },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            title: { display: true, text: 'Balance ($)', color: '#737373', font: { size: 11 } },
            ticks: {
              color: '#525252',
              callback: (v) => `$${v.toLocaleString()}`,
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [balances, labels, peakIdx, maxDdIdx, marketAt]);

  if (!log || log.length <= 1) {
    return (
      <div className="text-center py-16 text-neutral-500">No trades found.</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Title */}
      <p className="text-xs text-neutral-400 text-center">{title}</p>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-sky-400" /> Peak balance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-orange-400" /> Max drawdown point
        </span>
      </div>

      {/* Chart */}
      <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4" style={{ height: 420 }}>
        <canvas ref={canvasRef} />
      </div>

      {/* Quick stats under chart */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          {[
            { label: 'Peak',         value: `$${fmt(stats.peak_balance)}`,        cls: 'text-sky-400' },
            { label: 'Max Drawdown', value: `$${fmt(stats.max_drawdown_abs)} (${stats.max_drawdown_pct ?? '—'}%)`, cls: 'text-orange-400' },
            { label: 'Final',        value: `$${fmt(stats.final_balance)}`,        cls: 'text-emerald-400' },
            { label: 'Net P/L',      value: `${(stats.net_profit ?? 0) >= 0 ? '+' : ''}$${fmt(stats.net_profit)}`, cls: (stats.net_profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 px-4 py-2.5 text-center">
              <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
              <p className={`text-sm font-bold font-mono ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
