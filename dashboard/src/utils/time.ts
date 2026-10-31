// ============================================
// DIAMOND Time Utilities
// ============================================

export function formatTimestamp(iso: string, mode: 'agent' | 'local' | 'utc' = 'utc'): string {
  const date = new Date(iso);

  if (mode === 'utc') {
    return date.toISOString().replace('T', ' ').replace('Z', '') + 'Z';
  }

  if (mode === 'local') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}.${ms}`;
  }

  // Agent event time — same as UTC for mock data
  return date.toISOString().replace('T', ' ').replace('Z', '') + 'Z';
}

export function formatRelativeTime(startIso: string, currentIso: string): string {
  const start = new Date(startIso).getTime();
  const current = new Date(currentIso).getTime();
  const diffMs = current - start;

  if (diffMs < 0) return '0:00';

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatDateRange(start: string, end: string): string {
  const s = start.split('T')[0];
  const e = end.split('T')[0];
  return `${s} → ${e}`;
}

export function interpolateTimestamp(startIso: string, endIso: string, progress: number): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const time = start + (end - start) * Math.max(0, Math.min(1, progress));
  return new Date(time).toISOString();
}
