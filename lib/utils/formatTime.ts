// lib/utils/formatTime.ts
// Formats a Date or ISO string according to user's clock preference.

export type ClockFormat = '12h' | '24h';

export function formatTime(date: Date | string, clockFormat: ClockFormat = '12h'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (clockFormat === '24h') {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
