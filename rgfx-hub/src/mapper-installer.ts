/**
 * Mapper Installer
 *
 * Manages installation of default mappers to user data directory.
 * Default mappers are shipped with the app in config/mappings/ and copied to user directory on first run.
 */

import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import log from 'electron-log/main';
// USE_SOURCE_MAPPERS is defined in './config/constants' but currently always true
// TODO: Import and use when it becomes configurable

/**
 * Get the bundled mappers directory (config/mappings in development, Resources/config/mappings in production)
 */
function getBundledMappingsDir(): string {
  if (app.isPackaged) {
    // Production: Resources/config/mappings
    return join(process.resourcesPath, 'config', 'mappings');
  } else {
    // Development: rgfx-hub/config/mappings
    // __dirname points to .vite/build in dev, so go up to project root
    return join(app.getAppPath(), 'config', 'mappings');
  }
}

/**
 * Get the mappers directory
 * Currently always returns bundled source directory since USE_SOURCE_MAPPERS is true.
 * TODO: When USE_SOURCE_MAPPERS becomes configurable, add conditional logic to
 * return user data directory (~/Library/Application Support/rgfx-hub/mappings) when false.
 */
export function getMappingsDir(): string {
  // Always use source mappers in development (USE_SOURCE_MAPPERS is currently always true)
  return getBundledMappingsDir();

  // Future implementation when USE_SOURCE_MAPPERS becomes configurable:
  // return USE_SOURCE_MAPPERS
  //   ? getBundledMappingsDir()
  //   : join(app.getPath('userData'), 'mappings');
}

/**
 * Recursively copy directory contents
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      // Check if file already exists (don't overwrite user customizations)
      try {
        await fs.access(destPath);
        log.info(`Mapper already exists, skipping: ${entry.name}`);
      } catch {
        // File doesn't exist, copy it
        await fs.copyFile(srcPath, destPath);
        log.info(`Installed default mapper: ${relative(dest, destPath)}`);
      }
    }
  }
}

/**
 * Install default mappers to user data directory if they don't exist
 */
export async function installDefaultMappers(): Promise<void> {
  const bundledMappingsDir = getBundledMappingsDir();
  const userMappingsDir = getMappingsDir();

  try {
    log.info(`Copying default mappers from: ${bundledMappingsDir}`);
    log.info(`Installing to: ${userMappingsDir}`);

    await copyDirectory(bundledMappingsDir, userMappingsDir);

    log.info('Default mappers installation complete');
  } catch (error) {
    log.error('Failed to install default mappers:', error);
    throw error;
  }
}
