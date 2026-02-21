/**
 * Interceptor Installer
 *
 * Manages installation of default interceptors to user config directory.
 * Default interceptors are shipped with the app in assets/interceptors/
 * and copied to user directory on first run.
 */

import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import log from 'electron-log/main';
import { INTERCEPTORS_DIRECTORY } from './config/paths';

/** Files that should not be copied to user config (e.g. LSP type stubs) */
const EXCLUDED_FILES = ['mame.lua'];

/**
 * Get the bundled interceptors directory
 * (assets/interceptors in development, Resources/assets/interceptors in production)
 */
function getBundledInterceptorsDir(): string {
  if (app.isPackaged) {
    // Production: Resources/assets/interceptors
    return join(process.resourcesPath, 'assets', 'interceptors');
  } else {
    // Development: rgfx-hub/assets/interceptors
    // __dirname points to .vite/build in dev, so go up to project root
    return join(app.getAppPath(), 'assets', 'interceptors');
  }
}

/**
 * Get the user interceptors directory
 * Always returns user config directory (~/.rgfx/interceptors)
 */
function getInterceptorsDir(): string {
  return INTERCEPTORS_DIRECTORY;
}

/**
 * Recursively copy directory contents, only copying .lua files
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.lua') && !EXCLUDED_FILES.includes(entry.name)) {
      // Only copy .lua files, excluding type stubs
      // Check if file already exists (don't overwrite user customizations)
      try {
        await fs.access(destPath);
        log.info(`Interceptor already exists, skipping: ${entry.name}`);
      } catch {
        // File doesn't exist, copy it
        await fs.copyFile(srcPath, destPath);
        log.info(`Installed default interceptor: ${relative(dest, destPath)}`);
      }
    }
  }
}

/**
 * Install default interceptors to user config directory if they don't exist
 */
export async function installDefaultInterceptors(): Promise<void> {
  const bundledInterceptorsDir = getBundledInterceptorsDir();
  const userInterceptorsDir = getInterceptorsDir();

  try {
    log.info(`Copying default interceptors from: ${bundledInterceptorsDir}`);
    log.info(`Installing to: ${userInterceptorsDir}`);

    await copyDirectory(bundledInterceptorsDir, userInterceptorsDir);

    log.info('Default interceptors installation complete');
  } catch (error) {
    log.error('Failed to install default interceptors:', error);
    throw error;
  }
}
