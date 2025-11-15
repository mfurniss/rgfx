/**
 * Formatting utility functions for displaying data in human-readable formats
 */

import { intervalToDuration, formatDistanceToNow, type Locale } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * Custom locale for short-format relative times
 * Converts verbose output like "5 minutes" to "5m"
 */
const shortLocale: Locale = {
  ...enUS,
  formatDistance: (token, count, options) => {
    const formats: Record<string, string> = {
      lessThanXSeconds: `${count}s`,
      xSeconds: `${count}s`,
      halfAMinute: '30s',
      lessThanXMinutes: `${count}m`,
      xMinutes: `${count}m`,
      aboutXHours: `${count}h`,
      xHours: `${count}h`,
      xDays: `${count}d`,
      aboutXWeeks: `${count}w`,
      xWeeks: `${count}w`,
      aboutXMonths: `${count}mo`,
      xMonths: `${count}mo`,
      aboutXYears: `${count}y`,
      xYears: `${count}y`,
      overXYears: `${count}y`,
      almostXYears: `${count}y`,
    };
    const formatted = formats[token] ?? token;
    return options?.addSuffix ? `${formatted} ago` : formatted;
  },
};

/**
 * Format bytes into human-readable sizes (B, KB, MB, GB)
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

/**
 * Format milliseconds into human-readable uptime (e.g., "2d 5h 30m", "45s")
 * Uses date-fns intervalToDuration for consistent duration calculations
 */
export const formatUptime = (ms: number): string => {
  const duration = intervalToDuration({ start: 0, end: ms });

  const parts: string[] = [];
  if (duration.days) parts.push(`${duration.days}d`);
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);

  // Show seconds only if less than 1 minute
  if (parts.length === 0) {
    parts.push(`${duration.seconds ?? 0}s`);
  }

  return parts.join(' ');
};

/**
 * Format timestamp as relative time (e.g., "5m ago", "2h ago")
 * Uses date-fns with custom locale for short format
 */
export const formatTimestamp = (timestamp: number): string => {
  return formatDistanceToNow(timestamp, {
    addSuffix: true,
    locale: shortLocale,
  });
};
