import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventFileReader, isValidTopic } from '../event-file-reader';
import { writeFileSync, existsSync, mkdirSync, rmSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EVENT_LOG_MAX_SIZE_BYTES,
  EVENT_LOG_TRIM_TARGET_BYTES,
} from '../config/constants';

describe('EventFileReader', () => {
  let testDir: string;
  let testFilePath: string;
  let reader: EventFileReader;

  beforeEach(() => {
    testDir = join(tmpdir(), `rgfx-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    testFilePath = join(testDir, 'interceptor-events.log');
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

    writeFileSync(testFilePath, 'game/init pacman\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toEqual([['game/init', 'pacman']]);
  });

  it('should read events from file created after reader starts', async () => {
    // Use fake timers but only for setTimeout/setInterval — keep Date real
    // so chokidar's mtime comparisons work on Windows
    vi.useFakeTimers({
      toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
    });

    const events: [string, string][] = [];
    const onEvent = (topic: string, message: string) => events.push([topic, message]);

    reader.start(onEvent);

    // Create empty file first
    writeFileSync(testFilePath, '');

    // Advance time to trigger poll interval (5000ms) → finds file → starts watching
    await vi.advanceTimersByTimeAsync(5000);

    // Switch to real timers so chokidar (Windows) can initialize properly
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 100));

    // Append data — chokidar detects change and triggers readNewLines
    writeFileSync(testFilePath, 'game/init pacman\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 100));

    expect(events).toEqual([['game/init', 'pacman']]);
  });

  it('should parse multiple events', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game/init pacman\nplayer/score/p1 100\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(['game/init', 'pacman']);
    expect(events[1]).toEqual(['player/score/p1', '100']);
  });

  it('should handle messages with spaces', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game/status game in progress\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toEqual([['game/status', 'game in progress']]);
  });

  it('should skip empty lines', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game/init pacman\n\n\nplayer/score/p1 100\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(2);
  });

  it('should handle events without payloads', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game/init pacman\ngame/start\nplayer/score/p1 100\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual(['game/init', 'pacman']);
    expect(events[1]).toEqual(['game/start', '']);
    expect(events[2]).toEqual(['player/score/p1', '100']);
  });

  it('should skip to end when file is truncated', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game/init pacman\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    // Truncate and write new data
    writeFileSync(testFilePath, 'game/init galaga\n');
    await new Promise((r) => setTimeout(r, 50));

    // Should only get first event, not the second (because we skipped to end after truncation)
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(['game/init', 'pacman']);
  });

  it('should resume reading after file truncation and new append', async () => {
    const events: [string, string][] = [];

    // Create file with substantial content so truncation is detectable
    const padding = 'game/pad data\n'.repeat(50);
    writeFileSync(testFilePath, padding);
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 200));

    // Append an event (reader is positioned at end)
    writeFileSync(testFilePath, 'game/before truncation\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 200));

    expect(events).toHaveLength(1);
    expect(events[0][0]).toBe('game/before');

    // Truncate file to something smaller
    writeFileSync(testFilePath, 'game/small reset\n');
    // Windows chokidar polling needs time to detect truncation and reset position
    await new Promise((r) => setTimeout(r, 1000));

    // Now append new data after truncation
    writeFileSync(testFilePath, 'game/after recovery\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 1000));

    // Should have picked up the new event after truncation recovery
    const afterEvents = events.filter(([topic]) => topic === 'game/after');
    expect(afterEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should stop watching when stopped', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, 'game/init pacman\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    reader.stop();

    writeFileSync(testFilePath, 'player/score/p1 100\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(['game/init', 'pacman']);
  });

  describe('log file trimming', () => {
    it('should trim log file when exceeding max size threshold', async () => {
      const events: [string, string][] = [];

      // Create a file just under threshold
      const eventLine = 'game/init pacman\n';
      const linesNeeded = Math.ceil(EVENT_LOG_MAX_SIZE_BYTES / eventLine.length) + 100;
      const initialContent = eventLine.repeat(linesNeeded);

      writeFileSync(testFilePath, initialContent);
      reader.start((topic, msg) => events.push([topic, msg]));
      await new Promise((r) => setTimeout(r, 50));

      // Append to trigger a read (since we start at end of file)
      writeFileSync(testFilePath, 'game/trigger event\n', { flag: 'a' });
      await new Promise((r) => setTimeout(r, 100));

      const stats = statSync(testFilePath);
      expect(stats.size).toBeLessThan(EVENT_LOG_MAX_SIZE_BYTES);
      expect(stats.size).toBeGreaterThan(EVENT_LOG_TRIM_TARGET_BYTES - 1000);

      // Verify file starts at line boundary (no partial line at start)
      const content = readFileSync(testFilePath, 'utf-8');
      expect(content.startsWith('game/init pacman')).toBe(true);
    });

    it('should preserve recent events after trimming', async () => {
      const events: [string, string][] = [];

      // Create large file with a unique marker event near the end
      const eventLine = 'game/init pacman\n';
      const linesNeeded = Math.ceil(EVENT_LOG_MAX_SIZE_BYTES / eventLine.length);
      const markerEvent = 'game/marker unique-test-marker\n';

      // Put marker event in the last 100KB (well within trim target)
      const beforeMarker = eventLine.repeat(linesNeeded - 1000);
      const afterMarker = eventLine.repeat(500);
      const initialContent = beforeMarker + markerEvent + afterMarker;

      writeFileSync(testFilePath, initialContent);
      reader.start((topic, msg) => events.push([topic, msg]));
      await new Promise((r) => setTimeout(r, 50));

      // Trigger read and trim
      writeFileSync(testFilePath, 'game/trigger event\n', { flag: 'a' });
      await new Promise((r) => setTimeout(r, 100));

      const content = readFileSync(testFilePath, 'utf-8');
      expect(content).toContain('unique-test-marker');
    });

    it('should continue reading new events after trim', async () => {
      const events: [string, string][] = [];

      // Create file over threshold
      const eventLine = 'game/init pacman\n';
      const linesNeeded = Math.ceil(EVENT_LOG_MAX_SIZE_BYTES / eventLine.length) + 100;

      writeFileSync(testFilePath, eventLine.repeat(linesNeeded));
      reader.start((topic, msg) => events.push([topic, msg]));
      await new Promise((r) => setTimeout(r, 50));

      // Trigger trim
      writeFileSync(testFilePath, 'game/first-after-start event1\n', { flag: 'a' });
      await new Promise((r) => setTimeout(r, 100));

      // Clear events to track only new ones
      events.length = 0;

      // Write new event after trim
      writeFileSync(testFilePath, 'game/second-after-trim event2\n', { flag: 'a' });
      await new Promise((r) => setTimeout(r, 100));

      expect(events.some(([topic]) => topic === 'game/second-after-trim')).toBe(true);
    });

    it('should not trim when under threshold', async () => {
      const events: [string, string][] = [];

      // Create file well under threshold (100KB)
      const eventLine = 'game/init pacman\n';
      const linesFor100KB = Math.ceil(100 * 1024 / eventLine.length);
      const initialContent = eventLine.repeat(linesFor100KB);

      writeFileSync(testFilePath, initialContent);
      const initialSize = statSync(testFilePath).size;

      reader.start((topic, msg) => events.push([topic, msg]));
      await new Promise((r) => setTimeout(r, 50));

      // Trigger a read
      writeFileSync(testFilePath, 'game/new event\n', { flag: 'a' });
      await new Promise((r) => setTimeout(r, 100));

      const finalSize = statSync(testFilePath).size;
      // File should have grown by the new event, not been trimmed
      expect(finalSize).toBeGreaterThan(initialSize);
      expect(finalSize).toBeLessThan(EVENT_LOG_MAX_SIZE_BYTES);
    });
  });
});

describe('isValidTopic', () => {
  describe('valid topics', () => {
    it('should accept single segment topics', () => {
      expect(isValidTopic('game')).toBe(true);
      expect(isValidTopic('pacman')).toBe(true);
    });

    it('should accept two segment topics', () => {
      expect(isValidTopic('game/start')).toBe(true);
      expect(isValidTopic('pacman/init')).toBe(true);
    });

    it('should accept three segment topics', () => {
      expect(isValidTopic('pacman/player/score')).toBe(true);
      expect(isValidTopic('smb/sfx/jump')).toBe(true);
    });

    it('should accept four segment topics', () => {
      expect(isValidTopic('pacman/player/score/p1')).toBe(true);
      expect(isValidTopic('galaga/enemy/destroy/boss')).toBe(true);
    });

    it('should accept topics with hyphens', () => {
      expect(isValidTopic('smb/sfx/power-up')).toBe(true);
      expect(isValidTopic('game-name/event-type')).toBe(true);
    });

    it('should accept topics with underscores', () => {
      expect(isValidTopic('smb/sfx/power_up')).toBe(true);
      expect(isValidTopic('game_name/event_type')).toBe(true);
    });

    it('should accept topics with numbers', () => {
      expect(isValidTopic('player1/score')).toBe(true);
      expect(isValidTopic('galaga88/init')).toBe(true);
    });

    it('should accept rgfx system topics', () => {
      expect(isValidTopic('rgfx/interceptor/error')).toBe(true);
      expect(isValidTopic('rgfx/system/status')).toBe(true);
    });
  });

  describe('invalid topics', () => {
    it('should reject file paths', () => {
      expect(isValidTopic('/tmp/test/.rgfx/interceptors/game.lua')).toBe(false);
      expect(isValidTopic('/home/user/file.txt')).toBe(false);
    });

    it('should reject topics with leading slash', () => {
      expect(isValidTopic('/game/start')).toBe(false);
    });

    it('should reject topics with trailing slash', () => {
      expect(isValidTopic('game/start/')).toBe(false);
    });

    it('should reject topics with empty segments', () => {
      expect(isValidTopic('game//start')).toBe(false);
      expect(isValidTopic('pacman/player//score')).toBe(false);
    });

    it('should reject topics with uppercase letters', () => {
      expect(isValidTopic('Game/start')).toBe(false);
      expect(isValidTopic('pacman/Player/score')).toBe(false);
      expect(isValidTopic('PACMAN')).toBe(false);
    });

    it('should reject topics with more than 4 segments', () => {
      expect(isValidTopic('a/b/c/d/e')).toBe(false);
      expect(isValidTopic('pacman/player/score/p1/extra')).toBe(false);
    });

    it('should reject topics with dots', () => {
      expect(isValidTopic('game.lua')).toBe(false);
      expect(isValidTopic('config.json')).toBe(false);
    });

    it('should reject topics with colons', () => {
      expect(isValidTopic('file.lua:17:')).toBe(false);
      expect(isValidTopic('C:/Windows/path')).toBe(false);
    });

    it('should reject topics with spaces', () => {
      expect(isValidTopic('game start')).toBe(false);
      expect(isValidTopic('pacman player')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidTopic('')).toBe(false);
    });
  });
});

describe('EventFileReader invalid topic handling', () => {
  let testDir: string;
  let testFilePath: string;
  let reader: EventFileReader;

  beforeEach(() => {
    testDir = join(tmpdir(), `rgfx-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    testFilePath = join(testDir, 'interceptor-events.log');
    reader = new EventFileReader(testFilePath);
  });

  afterEach(async () => {
    reader.stop();
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should skip invalid topics and not call event callback', async () => {
    const events: [string, string][] = [];

    writeFileSync(testFilePath, '');
    reader.start((topic, msg) => events.push([topic, msg]));
    await new Promise((r) => setTimeout(r, 50));

    // Write mix of valid and invalid topics
    writeFileSync(
      testFilePath,
      'pacman/init pacman\n/tmp/test/file.lua:17: syntax error\ngame/start 1\n',
      { flag: 'a' },
    );
    await new Promise((r) => setTimeout(r, 50));

    // Only valid topics should be received
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(['pacman/init', 'pacman']);
    expect(events[1]).toEqual(['game/start', '1']);
  });

  it('should call error callback for invalid topics', async () => {
    const events: [string, string][] = [];
    const errors: string[] = [];

    writeFileSync(testFilePath, '');
    reader.start(
      (topic, msg) => events.push([topic, msg]),
      (errorMsg) => errors.push(errorMsg),
    );
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(testFilePath, '/tmp/test/file.lua:17: syntax error\n', { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Invalid topic');
    expect(errors[0]).toContain('/tmp/test/file.lua:17:');
  });

  it('should strip null bytes and process surrounding valid events', async () => {
    const events: [string, string][] = [];
    const errors: string[] = [];

    writeFileSync(testFilePath, '');
    reader.start(
      (topic, msg) => events.push([topic, msg]),
      (errorMsg) => errors.push(errorMsg),
    );
    await new Promise((r) => setTimeout(r, 50));

    // Write valid events with a block of null bytes between them
    const nullBlock = Buffer.alloc(1000, 0);
    const before = Buffer.from('game/init pacman\n');
    const after = Buffer.from('\ngame/start galaga\n');
    const combined = Buffer.concat([before, nullBlock, after]);
    writeFileSync(testFilePath, combined, { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(['game/init', 'pacman']);
    expect(events[1]).toEqual(['game/start', 'galaga']);
    expect(errors).toHaveLength(0);
  });

  it('should truncate long invalid topics in error messages', async () => {
    const events: [string, string][] = [];
    const errors: string[] = [];

    writeFileSync(testFilePath, '');
    reader.start(
      (topic, msg) => events.push([topic, msg]),
      (errorMsg) => errors.push(errorMsg),
    );
    await new Promise((r) => setTimeout(r, 50));

    // Write a 200-character invalid topic (uppercase, so it fails validation)
    const longTopic = 'INVALID_' + 'X'.repeat(192);
    writeFileSync(testFilePath, `${longTopic} some message\n`, { flag: 'a' });
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].length).toBeLessThan(150);
    expect(errors[0]).toContain('...');
  });

  it('should continue processing after invalid topic', async () => {
    const events: [string, string][] = [];
    const errors: string[] = [];

    writeFileSync(testFilePath, '');
    reader.start(
      (topic, msg) => events.push([topic, msg]),
      (errorMsg) => errors.push(errorMsg),
    );
    await new Promise((r) => setTimeout(r, 50));

    writeFileSync(
      testFilePath,
      'game/before valid1\nINVALID_UPPERCASE error\ngame/after valid2\n',
      { flag: 'a' },
    );
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(['game/before', 'valid1']);
    expect(events[1]).toEqual(['game/after', 'valid2']);
    expect(errors).toHaveLength(1);
  });
});

describe('getFileSizeBytes', () => {
  let testDir: string;
  let testFilePath: string;
  let reader: EventFileReader;

  beforeEach(() => {
    testDir = join(tmpdir(), `rgfx-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    testFilePath = join(testDir, 'interceptor-events.log');
    reader = new EventFileReader(testFilePath);
  });

  afterEach(async () => {
    reader.stop();
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return 0 when file does not exist', () => {
    expect(reader.getFileSizeBytes()).toBe(0);
  });

  it('should return file size when file exists', () => {
    writeFileSync(testFilePath, 'game/init pacman\n');
    const expectedSize = statSync(testFilePath).size;

    expect(reader.getFileSizeBytes()).toBe(expectedSize);
  });

  it('should return correct size for empty file', () => {
    writeFileSync(testFilePath, '');

    expect(reader.getFileSizeBytes()).toBe(0);
  });

  it('should return updated size after writes', () => {
    writeFileSync(testFilePath, 'game/init pacman\n');
    const size1 = reader.getFileSizeBytes();

    writeFileSync(testFilePath, 'game/init pacman\ngame/start 1\n');
    const size2 = reader.getFileSizeBytes();

    expect(size2).toBeGreaterThan(size1);
  });

});
