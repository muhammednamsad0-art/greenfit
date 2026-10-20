export function getTodayStr(): string {
  const d = new Date();
  return formatDate(d);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDayName(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getFormattedDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getShortDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDate(a) === formatDate(b);
}

export function isYesterday(a: Date, b: Date): boolean {
  return formatDate(addDays(a, 1)) === formatDate(b);
}

export function getWeekStart(d: Date = new Date()): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function getMonthStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function getDaysAgo(n: number): Date {
  return addDays(new Date(), -n);
}
