import { watch, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import log from "electron-log/main";

export class EventFileReader {
  private filePath: string;
  private filePosition: number = 0;
  private watcher?: ReturnType<typeof watch>;

  constructor() {
    // Default to platform-specific temp directory
    this.filePath = join(tmpdir(), "rgfx_events.log");
    log.info(`Event file path: ${this.filePath}`);
  }

  start(onEvent: (topic: string, message: string) => void) {
    log.info("Starting event file reader...");

    // Read initial position (seek to end)
    try {
      const stats = statSync(this.filePath);
      this.filePosition = stats.size;
      log.info(`Event file exists. Starting at position: ${this.filePosition}`);

      // Start watching the file
      this.watcher = watch(this.filePath, (eventType) => {
        if (eventType === "change") {
          this.readNewLines(onEvent);
        }
      });

      this.watcher.on("error", (err) => {
        log.error("Watch error:", err);
      });
    } catch (err) {
      log.error(`Event file not found: ${this.filePath}`, err);
    }
  }

  private readNewLines(onEvent: (topic: string, message: string) => void) {
    try {
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
        for (const line of lines) {
          const parts = line.split(" ", 2);
          if (parts.length >= 2) {
            const [topic, message] = parts;
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
      log.info("Event file reader stopped");
    }
  }
}
