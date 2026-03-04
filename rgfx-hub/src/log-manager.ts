import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import log from 'electron-log/main';
import type { DriverLogPersistence } from './driver-log-persistence';
import { EVENT_LOG_FILENAME } from './config/constants';
import { getErrorMessage } from './utils/driver-utils';

interface LogInfo {
  path: string;
  size: number;
}

interface DriverLogInfo extends LogInfo {
  driverId: string;
}

export interface LogSizes {
  system: LogInfo | null;
  events: LogInfo | null;
  drivers: DriverLogInfo[];
}

/**
 * Coordinates log file read/clear operations for the settings UI.
 * Does not handle log writing - that remains with DriverLogPersistence and electron-log.
 */
export class LogManager {
  private configDirectory: string;
  private driverLogPersistence: DriverLogPersistence;

  constructor(configDirectory: string, driverLogPersistence: DriverLogPersistence) {
    this.configDirectory = configDirectory;
    this.driverLogPersistence = driverLogPersistence;
  }

  /**
   * Get sizes of all log files.
   */
  async getSizes(): Promise<LogSizes> {
    const [system, events, drivers] = await Promise.all([
      this.getSystemLogInfo(),
      this.getEventsLogInfo(),
      this.getDriverLogsInfo(),
    ]);

    return { system, events, drivers };
  }

  /**
   * Clear all log files.
   */
  async clearAll(): Promise<void> {
    const sizes = await this.getSizes();

    const clearPromises: Promise<void>[] = [];

    if (sizes.system) {
      clearPromises.push(this.clearFile(sizes.system.path));
    }

    if (sizes.events) {
      clearPromises.push(this.clearFile(sizes.events.path));
    }

    for (const driver of sizes.drivers) {
      clearPromises.push(this.clearFile(driver.path));
    }

    await Promise.all(clearPromises);
    log.info('All logs cleared');
  }

  private getSystemLogPath(): string {
    // electron-log stores logs in the app's logs directory
    return path.join(app.getPath('logs'), 'main.log');
  }

  private getEventsLogPath(): string {
    return path.join(this.configDirectory, EVENT_LOG_FILENAME);
  }

  private getDriverLogsDirectory(): string {
    return path.join(this.configDirectory, 'logs');
  }

  private async getFileSize(filePath: string): Promise<number | null> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.size;
    } catch {
      return null;
    }
  }

  private async getSystemLogInfo(): Promise<LogInfo | null> {
    const filePath = this.getSystemLogPath();
    const size = await this.getFileSize(filePath);
    return size !== null ? { path: filePath, size } : null;
  }

  private async getEventsLogInfo(): Promise<LogInfo | null> {
    const filePath = this.getEventsLogPath();
    const size = await this.getFileSize(filePath);
    return size !== null ? { path: filePath, size } : null;
  }

  private async getDriverLogsInfo(): Promise<DriverLogInfo[]> {
    const logsDir = this.getDriverLogsDirectory();

    try {
      const files = await fs.promises.readdir(logsDir);
      const logFiles = files.filter((f) => f.endsWith('.log'));

      const infos: DriverLogInfo[] = [];

      for (const file of logFiles) {
        const filePath = path.join(logsDir, file);
        const size = await this.getFileSize(filePath);

        if (size !== null) {
          const driverId = file.replace('.log', '');
          infos.push({ driverId, path: filePath, size });
        }
      }

      return infos;
    } catch {
      // Directory doesn't exist yet
      return [];
    }
  }

  private async clearFile(filePath: string): Promise<void> {
    try {
      await fs.promises.writeFile(filePath, '', 'utf8');
    } catch (error) {
      log.error(`Failed to clear log file ${filePath}: ${getErrorMessage(error)}`);
    }
  }
}
