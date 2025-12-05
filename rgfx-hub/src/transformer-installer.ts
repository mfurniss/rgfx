/**
 * Transformer Installer
 *
 * Manages installation of default transformers to user config directory.
 * Default transformers are shipped with the app in assets/transformers/ and copied to user directory on first run.
 */

import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import log from 'electron-log/main';
import { TRANSFORMERS_DIRECTORY } from './config/paths';

/**
 * Get the bundled transformers directory (assets/transformers in development, Resources/assets/transformers in production)
 */
function getBundledTransformersDir(): string {
  if (app.isPackaged) {
    // Production: Resources/assets/transformers
    return join(process.resourcesPath, 'assets', 'transformers');
  } else {
    // Development: rgfx-hub/assets/transformers
    // __dirname points to .vite/build in dev, so go up to project root
    return join(app.getAppPath(), 'assets', 'transformers');
  }
}

/**
 * Get the user transformers directory
 * Always returns user config directory (~/.rgfx/transformers)
 */
export function getTransformersDir(): string {
  return TRANSFORMERS_DIRECTORY;
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
        log.info(`Transformer already exists, skipping: ${entry.name}`);
      } catch {
        // File doesn't exist, copy it
        await fs.copyFile(srcPath, destPath);
        log.info(`Installed default transformer: ${relative(dest, destPath)}`);
      }
    }
  }
}

/**
 * Install default transformers to user config directory if they don't exist
 */
export async function installDefaultTransformers(): Promise<void> {
  const bundledTransformersDir = getBundledTransformersDir();
  const userTransformersDir = getTransformersDir();

  try {
    log.info(`Copying default transformers from: ${bundledTransformersDir}`);
    log.info(`Installing to: ${userTransformersDir}`);

    await copyDirectory(bundledTransformersDir, userTransformersDir);

    log.info('Default transformers installation complete');
  } catch (error) {
    log.error('Failed to install default transformers:', error);
    throw error;
  }
}
