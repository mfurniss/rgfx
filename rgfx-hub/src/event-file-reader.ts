/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { watch, readFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import log from "electron-log/main";

export class EventFileReader {
  private filePath: string;
  private filePosition = 0;
  private watcher?: ReturnType<typeof watch>;
  private onEventCallback?: (topic: string, message: string) => void;

  constructor() {
    // Use stable ~/.rgfx directory
    const rgfxDir = join(homedir(), ".rgfx");

    // Ensure directory exists
    try {
      mkdirSync(rgfxDir, { recursive: true });
    } catch (err) {
      log.error("Failed to create .rgfx directory:", err);
    }

    this.filePath = join(rgfxDir, "mame_events.log");
    log.info(`Event file path: ${this.filePath}`);
  }

  start(onEvent: (topic: string, message: string) => void) {
    log.info("Starting event file reader...");
    this.onEventCallback = onEvent;

    // Check if file exists
    if (existsSync(this.filePath)) {
      // File exists - start at the end and watch for changes
      const stats = statSync(this.filePath);
      this.filePosition = stats.size;
      log.info(`Event file exists. Starting at position: ${this.filePosition}`);
      this.watchFile();
    } else {
      // File doesn't exist yet - watch the directory for file creation
      log.info(
        "Event file doesn't exist yet. Waiting for MAME to create it...",
      );
      this.watchDirectory();
    }
  }

  private watchFile() {
    // Watch the file for changes
    this.watcher = watch(this.filePath, (eventType) => {
      if (eventType === "change" && this.onEventCallback) {
        log.debug("fs.watch detected change");
        this.readNewLines(this.onEventCallback);
      }
    });

    this.watcher.on("error", (err) => {
      log.error("Watch error:", err);
    });
  }

  private watchDirectory() {
    // Watch the directory for the file to be created
    const dirPath = dirname(this.filePath);
    this.watcher = watch(dirPath, (eventType, filename) => {
      if (filename === "mame_events.log" && existsSync(this.filePath)) {
        log.info("Event file created. Starting to watch...");

        // Stop watching the directory
        if (this.watcher) {
          this.watcher.close();
        }

        // Reset position and start watching the file
        this.filePosition = 0;
        this.watchFile();
      }
    });

    this.watcher.on("error", (err) => {
      log.error("Directory watch error:", err);
    });
  }

  private readNewLines(onEvent: (topic: string, message: string) => void) {
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
      log.error("Error reading event file:", err);
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
    log.info("Event file reader stopped");
  }
}
