/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import {
  watch,
  readFileSync,
  writeFileSync,
  statSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import log from "electron-log/main";
import {
  EVENT_FILE_HEALTH_CHECK_INTERVAL_MS,
  EVENT_FILE_MAX_WATCHER_RESTARTS,
  EVENT_FILE_MAX_READ_RETRIES,
  EVENT_FILE_RETRY_DELAY_MS,
  EVENT_FILE_WATCHER_RESTART_DELAY_MS,
  EVENT_LOG_FILENAME,
} from "./config/constants";

export class EventFileReader {
  private filePath: string;
  private filePosition = 0;
  private watcher?: ReturnType<typeof watch>;
  private onEventCallback?: (topic: string, message: string) => void;
  private healthCheckInterval?: NodeJS.Timeout;
  private isWatchingFile = false;
  private watcherRestartCount = 0;

  constructor() {
    // Use stable ~/.rgfx directory
    const rgfxDir = join(homedir(), ".rgfx");

    // Ensure directory exists
    try {
      mkdirSync(rgfxDir, { recursive: true });
    } catch (err) {
      log.error("Failed to create .rgfx directory:", err);
    }

    this.filePath = join(rgfxDir, EVENT_LOG_FILENAME);
    log.info(`Event file path: ${this.filePath}`);
  }

  start(onEvent: (topic: string, message: string) => void) {
    log.info("Starting event file reader...");
    this.onEventCallback = onEvent;

    // Check if file exists
    if (existsSync(this.filePath)) {
      // File exists - truncate it to clear stale events from previous sessions
      writeFileSync(this.filePath, "");
      this.filePosition = 0;
      log.info("Event file truncated. Waiting for fresh events from MAME...");
      this.watchFile();
    } else {
      // File doesn't exist yet - watch the directory for file creation
      log.info(
        "Event file doesn't exist yet. Waiting for MAME to create it...",
      );
      this.watchDirectory();
    }

    // Start health check - periodically verify watching is working
    this.startHealthCheck();
  }

  private watchFile() {
    this.isWatchingFile = true;

    try {
      // Watch the file for changes
      this.watcher = watch(this.filePath, (_eventType) => {
        if (_eventType === "change" && this.onEventCallback) {
          this.readNewLines(this.onEventCallback);
        }
      });

      this.watcher.on("error", (err) => {
        log.error("Watch error:", err);
        this.handleWatcherFailure();
      });

      this.watcher.on("close", () => {
        log.warn("Watcher closed unexpectedly");
        if (this.onEventCallback) {
          // Watcher died - attempt to restart
          this.handleWatcherFailure();
        }
      });

      log.info("File watcher started successfully");
    } catch (err) {
      log.error("Failed to start file watcher:", err);
      this.handleWatcherFailure();
    }
  }

  private watchDirectory() {
    this.isWatchingFile = false;

    try {
      // Watch the directory for the file to be created
      const dirPath = dirname(this.filePath);
      this.watcher = watch(dirPath, (_eventType, filename) => {
        if (filename === EVENT_LOG_FILENAME && existsSync(this.filePath)) {
          log.info("Event file created. Starting to watch...");

          // Stop watching the directory
          if (this.watcher) {
            this.watcher.close();
          }

          // Reset position and start watching the file
          this.filePosition = 0;
          this.watcherRestartCount = 0; // Reset restart count on successful transition
          this.watchFile();
        }
      });

      this.watcher.on("error", (err) => {
        log.error("Directory watch error:", err);
        this.handleWatcherFailure();
      });

      log.info("Directory watcher started successfully");
    } catch (err) {
      log.error("Failed to start directory watcher:", err);
      this.handleWatcherFailure();
    }
  }

  private readNewLines(
    onEvent: (topic: string, message: string) => void,
    retryCount = 0,
  ) {
    try {
      // Check if file still exists before attempting to stat
      if (!existsSync(this.filePath)) {
        log.info("Event file deleted, switching to directory watch");
        if (this.watcher) {
          this.watcher.close();
        }
        this.filePosition = 0;
        this.watchDirectory();
        return;
      }

      const stats = statSync(this.filePath);
      const currentSize = stats.size;

      // Check for file truncation
      if (currentSize < this.filePosition) {
        log.info("File truncated, resetting position");
        this.filePosition = 0;
      }

      // Read new data
      if (currentSize > this.filePosition) {
        const buffer = readFileSync(this.filePath);
        const newData = buffer.toString(
          "utf-8",
          this.filePosition,
          currentSize,
        );
        this.filePosition = currentSize;

        // Parse lines
        const lines = newData
          .split("\n")
          .filter((line) => line.trim().length > 0);

        if (lines.length > 0) {
          log.debug(`Processing ${lines.length} event(s)`);
        }

        for (const line of lines) {
          // Split only on the FIRST space to preserve spaces in the message
          const firstSpaceIndex = line.indexOf(" ");
          if (firstSpaceIndex > 0) {
            const topic = line.substring(0, firstSpaceIndex);
            const message = line.substring(firstSpaceIndex + 1);
            onEvent(topic, message);
          }
        }
      }
    } catch (err) {
      log.error(
        `Error reading event file (attempt ${retryCount + 1}/${EVENT_FILE_MAX_READ_RETRIES}):`,
        err,
      );

      // Retry with exponential backoff
      if (retryCount < EVENT_FILE_MAX_READ_RETRIES) {
        const delay = EVENT_FILE_RETRY_DELAY_MS * Math.pow(2, retryCount);
        log.info(`Retrying in ${delay}ms...`);
        setTimeout(() => {
          this.readNewLines(onEvent, retryCount + 1);
        }, delay);
      } else {
        log.error(
          "Max retries exceeded reading event file. Attempting to restart watcher...",
        );
        this.handleWatcherFailure();
      }
    }
  }

  private handleWatcherFailure() {
    if (this.watcherRestartCount >= EVENT_FILE_MAX_WATCHER_RESTARTS) {
      log.error(
        `Max watcher restarts (${EVENT_FILE_MAX_WATCHER_RESTARTS}) exceeded. Stopping event reader.`,
      );
      return;
    }

    this.watcherRestartCount++;
    log.warn(
      `Attempting to restart watcher (attempt ${this.watcherRestartCount}/${EVENT_FILE_MAX_WATCHER_RESTARTS})...`,
    );

    // Clean up existing watcher
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch (err) {
        log.error("Error closing watcher:", err);
      }
      this.watcher = undefined;
    }

    // Wait a bit before restarting
    setTimeout(() => {
      if (!this.onEventCallback) {
        log.info("Event reader stopped, skipping watcher restart");
        return;
      }

      // Check file existence and restart appropriate watcher
      if (existsSync(this.filePath)) {
        log.info("Restarting file watcher...");
        this.watchFile();
      } else {
        log.info("File doesn't exist, restarting directory watcher...");
        this.watchDirectory();
      }
    }, EVENT_FILE_WATCHER_RESTART_DELAY_MS);
  }

  private startHealthCheck() {
    // Periodic check to ensure file watching is working
    this.healthCheckInterval = setInterval(() => {
      if (!this.onEventCallback) {
        return; // Reader is stopped
      }

      // Check if file exists when we think we're watching it
      if (this.isWatchingFile && !existsSync(this.filePath)) {
        log.warn("Health check: File disappeared while watching");
        this.handleWatcherFailure();
        return;
      }

      // Check if file exists when we're watching directory
      if (!this.isWatchingFile && existsSync(this.filePath)) {
        log.warn(
          "Health check: File exists but we're watching directory. Switching...",
        );
        if (this.watcher) {
          this.watcher.close();
        }
        this.filePosition = 0;
        this.watchFile();
        return;
      }

      // If watching file, try to read to verify watcher is alive
      if (this.isWatchingFile) {
        try {
          const stats = statSync(this.filePath);
          if (stats.size > this.filePosition) {
            log.debug("Health check: New data available, triggering read");
            this.readNewLines(this.onEventCallback);
          }
        } catch (err) {
          log.error("Health check: Error reading file stats:", err);
          this.handleWatcherFailure();
        }
      }
    }, EVENT_FILE_HEALTH_CHECK_INTERVAL_MS);

    log.info(
      `Health check started (interval: ${EVENT_FILE_HEALTH_CHECK_INTERVAL_MS}ms)`,
    );
  }

  stop() {
    // Clear health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Clear callback to prevent restart attempts
    this.onEventCallback = undefined;

    // Close watcher
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }

    log.info("Event file reader stopped");
  }
}
