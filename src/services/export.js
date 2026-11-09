import { jsPDF } from 'jspdf';
import { activeCurrencySymbol } from '../constants/currencies';

function csvEscape(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportToCSV(trades, filename) {
  const headers = ['Date', 'Market', 'Pair', 'Lot Size', 'Trade Result', 'P&L', 'Risk/Reward', 'Notes'];
  const rows = trades.map(t => [
    t.trade_date,
    t.market_type,
    t.pair,
    t.lot_size,
    t.result,
    t.pnl_amount,
    t.risk_reward || '',
    t.notes || '',
  ].map(csvEscape));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(trades, { from, to, label, accountCapital }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const totalPnl = trades.reduce((s, t) => s + parseFloat(t.pnl_amount), 0);
  const wins = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  const total = trades.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const calcDayStats = (tradeList) => {
    const map = {};
    tradeList.forEach(t => {
      const d = t.trade_date;
      if (!map[d]) map[d] = { pnl: 0 };
      map[d].pnl += parseFloat(t.pnl_amount);
    });
    return map;
  };

  const getMonthData = (trades) => {
    const byMonth = {};
    trades.forEach(t => {
      const m = t.trade_date.substring(0, 7);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(t);
    });
    return byMonth;
  };

  const drawCalendar = (monthKey, monthTrades, x, yStart, w, h) => {
    const dayStats = calcDayStats(monthTrades);
    const [year, month] = monthKey.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDow = (firstDay.getDay() + 6) % 7;

    const cellW = w / 7;
    const cellH = h / 6;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    doc.setFontSize(6);
    days.forEach((d, i) => {
      doc.setTextColor(100);
      doc.text(d, x + i * cellW + cellW / 2, yStart + 3, { align: 'center' });
    });

    for (let i = 0; i < startDow; i++) {
      const prevDay = new Date(year, month - 1, 0).getDate() - startDow + 1 + i;
      const cx = x + i * cellW;
      const cy = yStart + 5;
      doc.setFillColor(245, 245, 245);
      doc.rect(cx, cy, cellW - 0.5, cellH - 0.5, 'F');
      doc.setTextColor(180);
      doc.setFontSize(5);
      doc.text(String(prevDay), cx + 1, cy + 3);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
      const dow = (startDow + d - 1) % 7;
      const week = Math.floor((startDow + d - 1) / 7);
      const cx = x + dow * cellW;
      const cy = yStart + 5 + week * cellH;
      const stats = dayStats[dateStr];
      const pnl = stats ? stats.pnl : 0;

      if (pnl > 0) doc.setFillColor(5, 150, 105);
      else if (pnl < 0) doc.setFillColor(220, 38, 38);
      else doc.setFillColor(245, 245, 245);
      doc.rect(cx, cy, cellW - 0.5, cellH - 0.5, 'F');

      doc.setTextColor(pnl !== 0 ? 255 : 180);
      doc.setFontSize(5);
      doc.text(String(d), cx + 1, cy + 3);

      if (pnl !== 0) {
        const pct = accountCapital > 0 ? (pnl / accountCapital) * 100 : 0;
        const text = pct !== 0 ? `${pct > 0 ? '+' : ''}${Math.round(pct * 10) / 10}%` : `${activeCurrencySymbol()}${Math.round(pnl)}`;
        doc.setFontSize(4);
        doc.text(text, cx + 1, cy + cellH - 1);
      }
    }

    const remaining = 42 - startDow - daysInMonth;
    for (let d = 1; d <= remaining; d++) {
      const idx = startDow + daysInMonth + d - 1;
      const dow = idx % 7;
      const week = Math.floor(idx / 7);
      const cx = x + dow * cellW;
      const cy = yStart + 5 + week * cellH;
      doc.setFillColor(245, 245, 245);
      doc.rect(cx, cy, cellW - 0.5, cellH - 0.5, 'F');
      doc.setTextColor(180);
      doc.setFontSize(5);
      doc.text(String(d), cx + 1, cy + 3);
    }
  };

  const addNewPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkPage = (needed) => {
    if (y + needed > 297 - margin) {
      addNewPage();
    }
  };

  // --- Title ---
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text('Trade Report', margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${label}  |  ${total} trades  |  ${wins}W / ${losses}L  |  ${winRate}% win rate`, margin, y);
  y += 10;

  // --- Summary boxes ---
  const boxW = (contentW - 6) / 3;
  const summary = [
    { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}${activeCurrencySymbol()}${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: totalPnl >= 0 ? [5, 150, 105] : [220, 38, 38] },
    { label: 'Best Trade', value: trades.length > 0 ? `${activeCurrencySymbol()}${Math.max(...trades.map(t => parseFloat(t.pnl_amount))).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-', color: [5, 150, 105] },
    { label: 'Worst Trade', value: trades.length > 0 ? `${activeCurrencySymbol()}${Math.min(...trades.map(t => parseFloat(t.pnl_amount))).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-', color: [220, 38, 38] },
  ];

  summary.forEach((item, i) => {
    const bx = margin + i * (boxW + 3);
    doc.setFillColor(248, 248, 248);
    doc.rect(bx, y, boxW, 18, 'F');
    doc.setDrawColor(230);
    doc.rect(bx, y, boxW, 18, 'S');
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(item.label, bx + 3, y + 5);
    doc.setFontSize(10);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.value, bx + 3, y + 14);
  });
  y += 22;

  // --- Calendar heatmap ---
  const byMonth = getMonthData(trades);
  const months = Object.keys(byMonth).sort();

  if (months.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text('Calendar Heatmap', margin, y);
    y += 4;

    const calW = contentW;
    const calH = 35;

    months.forEach((mk) => {
      checkPage(calH + 8);
      const monthName = new Date(mk + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      doc.setFontSize(7);
      doc.setTextColor(80);
      doc.text(monthName, margin, y);
      y += 1;
      drawCalendar(mk, byMonth[mk], margin, y, calW, calH);
      y += calH + 4;
    });
  }

  // --- Trade list ---
  if (trades.length > 0) {
    checkPage(20);
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text('Trade List', margin, y);
    y += 6;

    const cols = [
      { label: 'Date', w: 22 },
      { label: 'Pair', w: 22 },
      { label: 'Market', w: 18 },
      { label: 'Lot', w: 12 },
      { label: 'Trade Result', w: 14 },
      { label: 'P&L', w: 20 },
      { label: 'R:R', w: 12 },
      { label: 'Notes', w: contentW - 22 - 22 - 18 - 12 - 14 - 20 - 12 },
    ];

    const headerH = 6;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentW, headerH, 'F');
    doc.setFontSize(6);
    doc.setTextColor(60);
    let cx = margin;
    cols.forEach(c => {
      doc.text(c.label, cx + 1, y + 4);
      cx += c.w;
    });
    y += headerH;

    trades.forEach((t, i) => {
      const rowH = 5;
      checkPage(rowH + 2);

      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, contentW, rowH, 'F');
      }

      doc.setFontSize(5);
      doc.setTextColor(40);
      cx = margin;
      const cells = [
        t.trade_date,
        t.pair,
        t.market_type,
        String(t.lot_size),
        t.result,
        `${parseFloat(t.pnl_amount) >= 0 ? '+' : ''}${activeCurrencySymbol()}${parseFloat(t.pnl_amount).toFixed(2)}`,
        t.risk_reward || '',
        (t.notes || '').substring(0, 40),
      ];

      cells.forEach((val, ci) => {
        if (ci === 4 || ci === 5) {
          const isWin = t.result === 'win' || parseFloat(t.pnl_amount) > 0;
          doc.setTextColor(isWin ? 5 : 220, isWin ? 150 : 38, isWin ? 105 : 38);
        } else {
          doc.setTextColor(40);
        }
        doc.text(val, cx + 1, y + 3.5);
        cx += cols[ci].w;
      });
      y += rowH;
    });
  }

  doc.save(`trades-${label.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}
