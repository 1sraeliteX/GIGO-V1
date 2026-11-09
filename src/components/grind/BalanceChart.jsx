import { useEffect, useRef } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip, Filler, Decimation } from 'chart.js';
import { useTheme } from '../../context/ThemeContext';
import { fmtMoney } from './shared';
import { useCurrency } from '../../context/CurrencyContext';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler, Decimation);

export default function BalanceChart({ report }) {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const { currency, currencyCode } = useCurrency();
  const money = (n) => fmtMoney(n, currency.symbol);
  const { log, stats, settings } = report;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || log.length === 0) return;

    const textColor = theme === 'dark' ? '#a1a1aa' : '#52525b';
    const gridColor = theme === 'dark' ? 'rgba(63,63,70,0.4)' : 'rgba(212,212,216,0.6)';
    const winColor = getComputedStyle(document.documentElement).getPropertyValue('--win-color').trim() || '#10b981';

    const markerNs = new Set([stats.peak_trade, stats.drawdown_peak_trade, stats.drawdown_trough_trade]);
    const pointRadius = (ctx) => ctx.raw && ctx.raw.x > 0 && markerNs.has(ctx.raw.x) ? 4 : 0;
    const pointColors = (ctx) => {
      const n = ctx.raw?.x;
      if (!n) return winColor;
      if (n === stats.drawdown_trough_trade) return '#ef4444';
      if (n === stats.peak_trade || n === stats.drawdown_peak_trade) return '#f59e0b';
      return winColor;
    };

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [{
          data: log.map(e => ({ x: e.n, y: e.balance })),
          borderColor: winColor,
          backgroundColor: 'rgba(16,185,129,0.08)',
          fill: true,
          borderWidth: 1.5,
          pointRadius,
          pointBackgroundColor: pointColors,
          pointHoverRadius: 5,
          tension: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `Trade ${items[0].raw.x}`,
              label: (item) => {
                const e = log[item.raw.x];
                const parts = [`Balance: ${money(e.balance)}`];
                if (e.market) parts.unshift(`${e.market} · ${e.result}`);
                if (e.n === stats.peak_trade && e.n > 0) parts.push('Peak');
                if (e.n === stats.drawdown_trough_trade && e.n > 0) parts.push('Max drawdown trough');
                return parts;
              },
            },
          },
          decimation: { enabled: true, algorithm: 'lttb', samples: 500 },
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Trade number', color: textColor },
            ticks: { color: textColor, maxTicksLimit: 12 },
            grid: { color: gridColor },
          },
          y: {
            title: { display: true, text: `Balance (${currency.symbol})`, color: textColor },
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [report, theme, currencyCode, currency.symbol]);

  const title = (
    <>
      Account Balance over {stats.total_trades} Trades ({money(settings.start_balance)} start,{' '}
      <span style={{ color: 'var(--win-color)' }}>+{money(settings.win_amount)} W</span>
      {' / '}
      <span style={{ color: 'var(--loss-color)' }}>-{money(settings.loss_amount)} L</span>)
    </>
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white break-words">{title}</h3>
      {settings.pnl_mode === 'actual' && (
        <p className="text-[11px] text-neutral-500">Actual P/L mode — recorded amounts are used instead of fixed W/L amounts.</p>
      )}
      <div className="h-[320px] sm:h-[420px] bg-neutral-900 border border-neutral-800 rounded-lg p-2">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-[11px] text-neutral-500">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />Peak / drawdown start
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-3 mr-1" />Largest drawdown trough
        {stats.max_drawdown > 0 && ` — max drawdown ${money(stats.max_drawdown)} (${stats.max_drawdown_pct}%), trades ${stats.drawdown_peak_trade}–${stats.drawdown_trough_trade}`}
      </p>
    </div>
  );
}