import * as XLSX from 'xlsx';

function logRows(report) {
  const rows = report.log.map(e => ({
    'Trade #': e.n,
    'Market': e.market ?? 'Start',
    'Row': e.row || '',
    'Column': e.col || '',
    'Result': e.result ?? '',
    'P/L ($)': e.pnl,
    'Balance ($)': e.balance,
    'Date': e.date ?? '',
  }));
  return rows;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportGrindCSV(report) {
  const rows = logRows(report);
  const headers = Object.keys(rows[0] ?? { 'Trade #': '' });
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n');
  download(new Blob([csv], { type: 'text/csv' }), 'grind-report.csv');
}

export function exportGrindExcel(report) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logRows(report)), 'Balance Log');

  const grindRows = report.markets.map(m => ({
    'Row #': m.row,
    'Market': m.name,
    'Trades': m.trades.map(t => t.result).join(''),
    'Wins': m.wins,
    'Losses': m.losses,
    'Win %': m.win_pct,
    'End Balance ($)': m.end_balance,
    'Net P/L ($)': m.net_pnl,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grindRows), 'Grind Table');

  const s = report.stats;
  const statsRows = [
    { 'Stat': 'Total trades', 'Value': s.total_trades },
    { 'Stat': 'Wins', 'Value': s.wins },
    { 'Stat': 'Losses', 'Value': s.losses },
    { 'Stat': 'Win rate %', 'Value': s.win_rate },
    { 'Stat': 'Final balance', 'Value': s.final_balance },
    { 'Stat': 'Net profit', 'Value': s.net_profit },
    { 'Stat': 'Total return %', 'Value': s.total_return_pct },
    { 'Stat': 'Peak balance', 'Value': s.peak_balance },
    { 'Stat': 'Lowest balance', 'Value': s.lowest_balance },
    { 'Stat': 'Max drawdown $', 'Value': s.max_drawdown },
    { 'Stat': 'Max drawdown %', 'Value': s.max_drawdown_pct },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsRows), 'Stats');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'grind-report.xlsx');
}