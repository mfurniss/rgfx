import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventFileReader } from '../event-file-reader';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { waitForFileWatcherReady } from './test-utils';

describe('EventFileReader', () => {
  let testFilePath: string;
  let reader: EventFileReader;

  beforeEach(() => {
    testFilePath = join(homedir(), '.rgfx', 'mame_events.log');
    // Clean up any existing test file
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
    reader = new EventFileReader();
  });

  afterEach(() => {
    reader.stop();
    // Clean up test file
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  it('should create EventFileReader instance', () => {
    expect(reader).toBeDefined();
  });

  it('should parse single event line correctly', async () => {
    // Create test file with initial content (will be ignored by watcher)
    writeFileSync(testFilePath, 'initial data\n');

    const mockCallback = vi.fn();

    // Start watching (starts at end of file)
    reader.start(mockCallback);

    // Write and retry until watcher detects the change
    // This solves the fs.watch initialization race condition on macOS
    await waitForFileWatcherReady(
      testFilePath,
      'game pacman\n',
      1,
      () => mockCallback.mock.calls.length
    );

    // Verify data event (ignore probe events)
    const dataEvents = mockCallback.mock.calls.filter(([topic]) => topic !== 'rgfx/test');
    expect(dataEvents).toHaveLength(1);
    expect(dataEvents[0]).toEqual(['game', 'pacman']);
  });

  it('should parse multiple event lines correctly', async () => {
    writeFileSync(testFilePath, 'initial data\n');

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await waitForFileWatcherReady(
      testFilePath,
      'game pacman\nplayer/score/p1 100\nplayer/pill/state 1\n',
      3,
      () => mockCallback.mock.calls.length
    );

    // Should have received probe events + 3 data events
    // We verify the data, regardless of how many probes were needed
    const calls = mockCallback.mock.calls;
    const dataEvents = calls.filter(([topic]) => topic !== 'rgfx/test');

    expect(dataEvents).toHaveLength(3);
    expect(dataEvents[0]).toEqual(['game', 'pacman']);
    expect(dataEvents[1]).toEqual(['player/score/p1', '100']);
    expect(dataEvents[2]).toEqual(['player/pill/state', '1']);
  });

  it('should handle messages with spaces in the payload', async () => {
    writeFileSync(testFilePath, 'initial data\n');

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await waitForFileWatcherReady(
      testFilePath,
      'status game in progress\n',
      1,
      () => mockCallback.mock.calls.length
    );

    // Verify data event (ignore probe events)
    const dataEvents = mockCallback.mock.calls.filter(([topic]) => topic !== 'rgfx/test');
    expect(dataEvents).toHaveLength(1);
    expect(dataEvents[0]).toEqual(['status', 'game in progress']);
  });

  it('should skip empty lines', async () => {
    writeFileSync(testFilePath, 'initial data\n');

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await waitForFileWatcherReady(
      testFilePath,
      'game pacman\n\n\nplayer/score/p1 100\n',
      2,
      () => mockCallback.mock.calls.length
    );

    // Should only call for two valid lines (ignore empty lines and probe events)
    const dataEvents = mockCallback.mock.calls.filter(([topic]) => topic !== 'rgfx/test');
    expect(dataEvents).toHaveLength(2);
  });

  it('should skip malformed lines without topic and message', async () => {
    writeFileSync(testFilePath, 'initial data\n');

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await waitForFileWatcherReady(
      testFilePath,
      'game pacman\ninvalidline\nplayer/score/p1 100\n',
      2,
      () => mockCallback.mock.calls.length
    );

    // Should only call for two valid lines (skip "invalidline" and probe events)
    const dataEvents = mockCallback.mock.calls.filter(([topic]) => topic !== 'rgfx/test');
    expect(dataEvents).toHaveLength(2);
    expect(dataEvents[0]).toEqual(['game', 'pacman']);
    expect(dataEvents[1]).toEqual(['player/score/p1', '100']);
  });

  it('should handle file truncation by resetting position', async () => {
    writeFileSync(testFilePath, 'initial data\n');

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    // Write initial data
    await waitForFileWatcherReady(
      testFilePath,
      'game pacman\n',
      1,
      () => mockCallback.mock.calls.length
    );

    // Truncate file (simulate log rotation or reset)
    writeFileSync(testFilePath, '');

    // Write new data (file watcher will detect size change and reset position)
    await waitForFileWatcherReady(
      testFilePath,
      'game galaga\n',
      1,
      () => mockCallback.mock.calls.length
    );

    // Should have received both events (ignore probe events)
    const dataEvents = mockCallback.mock.calls.filter(([topic]) => topic !== 'rgfx/test');
    expect(dataEvents).toHaveLength(2);
    expect(dataEvents[0]).toEqual(['game', 'pacman']);
    expect(dataEvents[1]).toEqual(['game', 'galaga']);
  });

  it('should stop watching when stop() is called', async () => {
    writeFileSync(testFilePath, 'initial data\n');

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    // Write event before stopping
    await waitForFileWatcherReady(
      testFilePath,
      'game pacman\n',
      1,
      () => mockCallback.mock.calls.length
    );

    reader.stop();

    // Write event after stopping
    writeFileSync(testFilePath, 'player/score/p1 100\n', { flag: 'a' });

    // Wait a bit to ensure no further callbacks
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should only have received first event (ignore probe events, not the event after stop)
    const dataEvents = mockCallback.mock.calls.filter(([topic]) => topic !== 'rgfx/test');
    expect(dataEvents).toHaveLength(1);
    expect(dataEvents[0]).toEqual(['game', 'pacman']);
  });
});
