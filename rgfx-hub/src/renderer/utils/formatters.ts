/**
 * Formatting utility functions for displaying data in human-readable formats
 */

import { intervalToDuration } from 'date-fns';

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
 * Format milliseconds into human-readable uptime (days, hours, minutes, seconds)
 * Uses date-fns for consistent, locale-aware formatting
 */
export const formatUptime = (ms: number): string => {
  const duration = intervalToDuration({ start: 0, end: ms });

  // Custom short format to maintain existing UI style: "2d 5h 30m"
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
 * Uses date-fns formatDistanceToNow with custom short format
 */
export const formatTimestamp = (timestamp: number, currentTime: number): string => {
  const diff = currentTime - timestamp;
  const seconds = Math.floor(diff / 1000);

  // Use short format to match existing UI style
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
