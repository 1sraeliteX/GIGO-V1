export function fmtMoney(n) {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}$${abs}`;
}

export function resultStyle(result) {
  if (result === 'W') {
    return { backgroundColor: 'rgb(var(--win-color-rgb) / 0.18)', color: 'var(--win-color)' };
  }
  if (result === 'L') {
    return { backgroundColor: 'rgb(var(--loss-color-rgb) / 0.18)', color: 'var(--loss-color)' };
  }
  return {};
}

export const cellClass = 'h-7 min-w-[28px] px-1 text-center text-xs font-semibold border border-neutral-800';
export const headClass = 'h-7 px-1 text-center text-[10px] font-medium text-neutral-400 border border-neutral-800 bg-neutral-900';