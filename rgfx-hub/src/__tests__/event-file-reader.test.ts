import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventFileReader } from '../event-file-reader';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('EventFileReader', () => {
  let testDir: string;
  let testFilePath: string;
  let reader: EventFileReader;

  beforeEach(() => {
    testDir = join(tmpdir(), `rgfx-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    testFilePath = join(testDir, 'interceptor_events.log');
    reader = new EventFileReader(testFilePath);
  });

  afterEach(async () => {
    reader.stop();

    // Restore real timers if fake timers were used
    vi.useRealTimers();

    // Wait for async cleanup to complete (file watchers, intervals)
    await new Promise(resolve => setTimeout(resolve, 100));

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create EventFileReader instance', () => {
    expect(reader).toBeDefined();
  });

  it('should read events from file that exists when reader starts', async () => {
    const events: [string, string][] = [];
    const onEvent = (topic: string, message: string) => events.push([topic, message]);

    writeFileSync(testFilePath, '');
    reader.start(onEvent);
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game pacman\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toEqual([['game', 'pacman']]);
  });

  it('should read events from file created after reader starts', async () => {
    vi.useFakeTimers();

    const events: [string, string][] = [];
    const onEvent = (topic: string, message: string) => events.push([topic, message]);

    reader.start(onEvent);

    // Create empty file first
    writeFileSync(testFilePath, '');

    // Advance time to trigger poll interval (5000ms)
    await vi.advanceTimersByTimeAsync(5000);

    // Then append data - this triggers the file watcher
    writeFileSync(testFilePath, 'game pacman\n', { flag: 'a' });
    await vi.advanceTimersByTimeAsync(50);

    expect(events).toEqual([['game', 'pacman']]);
  });

  it('should parse multiple events', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game pacman\nplayer/score/p1 100\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(['game', 'pacman']);
    expect(events[1]).toEqual(['player/score/p1', '100']);
  });

  it('should handle messages with spaces', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'status game in progress\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toEqual([['status', 'game in progress']]);
  });

  it('should skip empty lines', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game pacman\n\n\nplayer/score/p1 100\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(2);
  });

  it('should handle events without payloads', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game pacman\neventWithoutPayload\nplayer/score/p1 100\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual(['game', 'pacman']);
    expect(events[1]).toEqual(['eventWithoutPayload', '']);
    expect(events[2]).toEqual(['player/score/p1', '100']);
  });

  it('should skip to end when file is truncated', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game pacman\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    // Truncate and write new data
    writeFileSync(testFilePath, 'game galaga\n');
    await new Promise((r) => setTimeout(r, 50));

    // Should only get first event, not the second (because we skipped to end after truncation)
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(['game', 'pacman']);
  });

  it('should stop watching when stopped', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game pacman\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    reader.stop();

    writeFileSync(testFilePath, 'player/score/p1 100\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(['game', 'pacman']);
  });
});
