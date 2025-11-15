import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatBytes, formatUptime, formatTimestamp } from '../formatters';

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2048)).toBe('2 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(2147483648)).toBe('2 GB');
    expect(formatBytes(5368709120)).toBe('5 GB');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatBytes(1536000)).toBe('1.46 MB');
    expect(formatBytes(1234567)).toBe('1.18 MB');
  });
});

describe('formatUptime', () => {
  it('formats seconds only when less than 1 minute', () => {
    expect(formatUptime(0)).toBe('0s');
    expect(formatUptime(1000)).toBe('1s');
    expect(formatUptime(30000)).toBe('30s');
    expect(formatUptime(59000)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(formatUptime(60000)).toBe('1m 0s');
    expect(formatUptime(90000)).toBe('1m 30s');
    expect(formatUptime(300000)).toBe('5m 0s');
    expect(formatUptime(3599000)).toBe('59m 59s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatUptime(3600000)).toBe('1h 0m 0s');
    expect(formatUptime(3660000)).toBe('1h 1m 0s');
    expect(formatUptime(3665000)).toBe('1h 1m 5s');
    expect(formatUptime(7200000)).toBe('2h 0m 0s');
    expect(formatUptime(9000000)).toBe('2h 30m 0s');
    expect(formatUptime(9045000)).toBe('2h 30m 45s');
  });

  it('formats days, hours, minutes, and seconds', () => {
    expect(formatUptime(86400000)).toBe('1d 0h 0m 0s');
    expect(formatUptime(90000000)).toBe('1d 1h 0m 0s');
    expect(formatUptime(93600000)).toBe('1d 2h 0m 0s');
    expect(formatUptime(176400000)).toBe('2d 1h 0m 0s');
    expect(formatUptime(180000000)).toBe('2d 2h 0m 0s');
    expect(formatUptime(90065000)).toBe('1d 1h 1m 5s');
  });

  it('always includes seconds', () => {
    expect(formatUptime(60000)).toBe('1m 0s');
    expect(formatUptime(3600000)).toBe('1h 0m 0s');
    expect(formatUptime(86400000)).toBe('1d 0h 0m 0s');
  });

  it('formats complex durations with all components', () => {
    // 2 days, 5 hours, 30 minutes, 15 seconds
    const ms = 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 30 * 60 * 1000 + 15 * 1000;
    expect(formatUptime(ms)).toBe('2d 5h 30m 15s');
  });
});

describe('formatTimestamp', () => {
  beforeEach(() => {
    // Mock Date.now() to return a consistent value
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats timestamps less than a minute ago', () => {
    const now = Date.now();
    // date-fns rounds small values to "less than a minute"
    expect(formatTimestamp(now - 5000)).toBe('1m ago');
    expect(formatTimestamp(now - 30000)).toBe('1m ago');
    expect(formatTimestamp(now - 44000)).toBe('1m ago'); // Rounds to "less than a minute"
  });

  it('formats timestamps in minutes', () => {
    const now = Date.now();
    expect(formatTimestamp(now - 60000)).toBe('1m ago');
    expect(formatTimestamp(now - 120000)).toBe('2m ago');
    expect(formatTimestamp(now - 300000)).toBe('5m ago');
    expect(formatTimestamp(now - 1800000)).toBe('30m ago'); // 30 minutes
  });

  it('formats timestamps in hours', () => {
    const now = Date.now();
    expect(formatTimestamp(now - 3600000)).toBe('1h ago');
    expect(formatTimestamp(now - 7200000)).toBe('2h ago');
    expect(formatTimestamp(now - 18000000)).toBe('5h ago');
  });

  it('formats timestamps in days', () => {
    const now = Date.now();
    expect(formatTimestamp(now - 86400000)).toBe('1d ago');
    expect(formatTimestamp(now - 172800000)).toBe('2d ago');
    expect(formatTimestamp(now - 432000000)).toBe('5d ago');
  });

  it('formats timestamps in months', () => {
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    expect(formatTimestamp(now - oneMonth)).toBe('1mo ago');
    expect(formatTimestamp(now - oneMonth * 2)).toBe('2mo ago');
  });

  it('formats timestamps in years', () => {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    expect(formatTimestamp(now - oneYear)).toBe('1y ago');
    expect(formatTimestamp(now - oneYear * 2)).toBe('2y ago');
  });

  it('uses short format suffixes', () => {
    const now = Date.now();
    // Verify we get "5m ago" not "5 minutes ago"
    const result = formatTimestamp(now - 300000);
    expect(result).toMatch(/^\d+[smhdwy]+ ago$/);
  });
});
