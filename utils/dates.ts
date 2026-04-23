export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekDates(weekOffset = 0): Array<{ iso: string; short: string; date: number }> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7);

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, short: DAY_NAMES[i], date: d.getDate() };
  });
}

export function getWeekRange(weekOffset = 0): { from: string; to: string } {
  const dates = getWeekDates(weekOffset);
  return { from: dates[0].iso, to: dates[6].iso };
}

export function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This Week';
  if (weekOffset === 1) return 'Next Week';
  if (weekOffset === -1) return 'Last Week';
  if (weekOffset > 0) return `In ${weekOffset} Weeks`;
  return `${Math.abs(weekOffset)} Weeks Ago`;
}

export function formatWeekRange(weekOffset: number): string {
  const dates = getWeekDates(weekOffset);
  const first = dates[0];
  const last  = dates[6];
  const d0 = new Date(first.iso + 'T00:00:00');
  const d6 = new Date(last.iso  + 'T00:00:00');
  const monthName = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  if (d0.getMonth() === d6.getMonth()) {
    return `${monthName(d0)} ${first.date}–${last.date}`;
  }
  return `${monthName(d0)} ${first.date} – ${monthName(d6)} ${last.date}`;
}

export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
