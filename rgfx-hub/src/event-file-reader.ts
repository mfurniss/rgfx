import {
  watch,
  readFileSync,
  openSync,
  readSync,
  closeSync,
  statSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import log from 'electron-log/main';
import {
  EVENT_LOG_FILENAME,
  EVENT_FILE_POLL_INTERVAL_MS,
  EVENT_LOG_MAX_SIZE_BYTES,
  EVENT_LOG_TRIM_TARGET_BYTES,
} from './config/constants';
import { CONFIG_DIRECTORY } from './config/paths';

// Valid topic: 1-4 segments of lowercase alphanumeric, hyphens, underscores
// Examples: "pacman/player/score", "smb/sfx/jump", "rgfx/interceptor/error"
const VALID_TOPIC_REGEX = /^[a-z0-9_-]+(?:\/[a-z0-9_-]+){0,3}$/;

export function isValidTopic(topic: string): boolean {
  return VALID_TOPIC_REGEX.test(topic);
}

export class EventFileReader {
  private filePath: string;
  private filePosition = 0;
  private watcher?: ReturnType<typeof watch>;
  private chokidarWatcher?: FSWatcher;
  private pollInterval?: NodeJS.Timeout;
  private onEventCallback?: (topic: string, message: string) => void;
  private onErrorCallback?: (message: string) => void;

  constructor(customFilePath?: string) {
    if (customFilePath) {
      this.filePath = customFilePath;
    } else {
      try {
        mkdirSync(CONFIG_DIRECTORY, { recursive: true });
      } catch (err) {
        log.error('Failed to create .rgfx directory:', err);
      }
      this.filePath = join(CONFIG_DIRECTORY, EVENT_LOG_FILENAME);
    }
    log.info(`Event file path: ${this.filePath}`);
  }

  start(onEvent: (topic: string, message: string) => void, onError?: (message: string) => void) {
    log.info('Starting event file reader...');
    this.onEventCallback = onEvent;
    this.onErrorCallback = onError;
    this.checkForFile();
  }

  private checkForFile() {
    if (!this.onEventCallback) {
      return;
    }

    if (existsSync(this.filePath)) {
      // [A] File exists - set position to end and start watching
      try {
        const stats = statSync(this.filePath);
        this.filePosition = stats.size;
        log.info(`Event file found. Starting from position ${this.filePosition}`);
        this.startWatching();
      } catch (err) {
        log.error('Error checking file size:', err);
        this.startPolling();
      }
    } else {
      // [B] File doesn't exist - poll every 5 seconds
      log.info("Event file doesn't exist yet. Polling...");
      this.startPolling();
    }
  }

  private startWatching() {
    // Stop polling if active
    this.stopPolling();

    try {
      if (process.platform === 'win32') {
        // Windows: use chokidar with polling for reliable low-latency detection
        // Native fs.watch on Windows uses ReadDirectoryChangesW which has high latency
        this.chokidarWatcher = chokidar.watch(this.filePath, {
          persistent: true,
          usePolling: true,
          interval: 10,
          awaitWriteFinish: false,
          ignoreInitial: true,
        });

        this.chokidarWatcher.on('change', () => {
          if (this.onEventCallback) {
            this.readNewLines();
          }
        });

        this.chokidarWatcher.on('error', (err: unknown) => {
          log.error('Chokidar watch error:', err);
          this.handleError();
        });
      } else {
        // macOS/Linux: use native fs.watch (fast and reliable)
        this.watcher = watch(this.filePath, (eventType) => {
          if (eventType === 'change' && this.onEventCallback) {
            this.readNewLines();
          }
        });

        this.watcher.on('error', (err) => {
          log.error('Watch error:', err);
          this.handleError();
        });
      }

      log.info('File watcher started');
    } catch (err) {
      log.error('Failed to start watcher:', err);
      this.handleError();
    }
  }

  private startPolling() {
    this.stopWatching();

    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        if (existsSync(this.filePath)) {
          log.info('Event file appeared');
          this.checkForFile();
        }
      }, EVENT_FILE_POLL_INTERVAL_MS);
      log.info(`Polling for file every ${EVENT_FILE_POLL_INTERVAL_MS}ms`);
    }
  }

  private stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }

    if (this.chokidarWatcher) {
      void this.chokidarWatcher.close();
      this.chokidarWatcher = undefined;
    }

    log.debug('File watcher stopped');
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
      log.debug('Polling stopped');
    }
  }

  private handleError() {
    // [C] Read error - stop watching and start polling
    log.warn('Error occurred, switching to polling mode');
    this.stopWatching();
    this.filePosition = 0;
    this.startPolling();
  }

  private trimLogFile() {
    try {
      const content = readFileSync(this.filePath, 'utf-8');
      const trimPoint = content.length - EVENT_LOG_TRIM_TARGET_BYTES;
      const firstNewline = content.indexOf('\n', trimPoint);
      const trimmedContent = content.substring(firstNewline + 1);
      writeFileSync(this.filePath, trimmedContent);
      this.filePosition = trimmedContent.length;
      log.info(`Event log trimmed from ${content.length} to ${trimmedContent.length} bytes`);
    } catch (err) {
      log.error('Error trimming event log:', err);
    }
  }

  private readNewLines() {
    if (!this.onEventCallback) {
      return;
    }

    try {
      if (!existsSync(this.filePath)) {
        log.info('Event file disappeared');
        this.handleError();
        return;
      }

      const stats = statSync(this.filePath);
      const currentSize = stats.size;

      // File was truncated - skip to end
      if (currentSize < this.filePosition) {
        log.info('File truncated, skipping to end');
        this.filePosition = currentSize;
      }

      // Read only new bytes (avoids allocating a buffer for the entire file)
      if (currentSize > this.filePosition) {
        const bytesToRead = currentSize - this.filePosition;
        const buffer = Buffer.alloc(bytesToRead);
        const fd = openSync(this.filePath, 'r');

        try {
          readSync(fd, buffer, 0, bytesToRead, this.filePosition);
        } finally {
          closeSync(fd);
        }

        const newData = buffer.toString('utf-8').replace(/\0/g, '');
        this.filePosition = currentSize;

        const lines = newData.split('\n').filter((line) => line.trim().length > 0);

        if (lines.length > 0) {
          log.debug(`Processing ${lines.length} event(s)`);
        }

        for (const rawLine of lines) {
          // Trim handles Windows \r\n line endings from MAME on Windows
          const line = rawLine.trim();
          const firstSpaceIndex = line.indexOf(' ');
          const topic = firstSpaceIndex > 0 ? line.substring(0, firstSpaceIndex) : line;
          const message = firstSpaceIndex > 0 ? line.substring(firstSpaceIndex + 1).trim() : '';

          if (!isValidTopic(topic)) {
            const displayTopic = topic.length > 80 ? topic.substring(0, 80) + '...' : topic;
            const errorMsg = `Invalid topic in event log: "${displayTopic}"`;
            log.error(errorMsg);

            if (this.onErrorCallback) {
              this.onErrorCallback(errorMsg);
            }
            continue;
          }

          log.debug(`Event read: ${topic}${message ? ` = ${message}` : ' (no payload)'}`);
          this.onEventCallback(topic, message);
        }

        if (this.filePosition > EVENT_LOG_MAX_SIZE_BYTES) {
          this.trimLogFile();
        }
      }
    } catch (err) {
      log.error('Error reading event file:', err);
      this.handleError();
    }
  }

  stop() {
    this.onEventCallback = undefined;
    this.stopWatching();
    this.stopPolling();
    log.info('Event file reader stopped');
  }

  getFileSizeBytes(): number {
    try {
      if (existsSync(this.filePath)) {
        return statSync(this.filePath).size;
      }
    } catch {
      // File doesn't exist or can't be read
    }
    return 0;
  }
}
