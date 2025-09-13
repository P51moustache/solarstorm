import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(relativeTime);

export { dayjs };

export function formatTimeAgo(timestamp: string): string {
  // SWPC timestamps are in UTC but don't have 'Z' suffix
  // Explicitly treat them as UTC to avoid timezone conversion issues
  const utcTime = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return dayjs(utcTime).fromNow();
}

export function formatTime(timestamp: string): string {
  const utcTime = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return dayjs(utcTime).utc().format('HH:mm UTC');
}

export function formatTimeLocal(timestamp: string): string {
  const utcTime = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return dayjs(utcTime).format('HH:mm');
}

export function formatTimeLocalWithTz(timestamp: string): string {
  const utcTime = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const localTime = dayjs(utcTime);
  // Day.js without timezone plugin returns the literal token 'z'. Guard for that.
  let tzAbbr = '';
  try {
    const raw = localTime.format('z');
    if (raw && raw !== 'z') tzAbbr = raw;
  } catch {}
  if (!tzAbbr) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    tzAbbr = tz.split('/').pop() || 'Local';
  }
  return `${localTime.format('HH:mm')} ${tzAbbr}`;
}

export function formatDate(timestamp: string): string {
  const utcTime = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return dayjs(utcTime).utc().format('MMM DD, HH:mm UTC');
}

export function formatDateLocal(timestamp: string): string {
  const utcTime = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return dayjs(utcTime).format('MMM DD, HH:mm');
}

export function isWithinMinutes(timestamp: string, minutes: number): boolean {
  const utcTime = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return dayjs().diff(dayjs(utcTime), 'minute') <= minutes;
}

export function getMinutesAgo(timestamp: string): number {
  const utcTime = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return dayjs().diff(dayjs(utcTime), 'minute');
}

export function filterRecent(
  data: Array<{ time_tag: string }>,
  hours: number
): Array<{ time_tag: string }> {
  const cutoff = dayjs().subtract(hours, 'hour');
  return data.filter(item => dayjs(item.time_tag).isAfter(cutoff));
}

export function downsampleTimeSeries<T extends { time_tag: string }>(
  data: T[],
  maxPoints: number
): T[] {
  if (data.length <= maxPoints) return data;
  
  const step = Math.floor(data.length / maxPoints);
  const result: T[] = [];
  
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }
  
  return result;
}
