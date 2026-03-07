import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import log from 'electron-log/main';

/**
 * Resolve the bundled assets directory for a given subdirectory.
 * In development: <appPath>/assets/<subdir>
 * In production: <resourcesPath>/assets/<subdir>
 */
export function getBundledAssetDir(subdir: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'assets', subdir)
    : join(app.getAppPath(), 'assets', subdir);
}

interface InstallBundledAssetsOptions {
  bundledDir: string;
  targetDir: string;
  label: string;
  /** Return true to include a file; omit to include all files */
  fileFilter?: (filename: string) => boolean;
  /** Return true for files that should always be overwritten (system files, not user-editable) */
  alwaysOverwrite?: (filename: string) => boolean;
}

/**
 * Recursively copies bundled assets to the target directory,
 * skipping files that already exist (preserving user customisations).
 */
export async function installBundledAssets(
  options: InstallBundledAssetsOptions,
): Promise<void> {
  const { bundledDir, targetDir, label, fileFilter, alwaysOverwrite } = options;

  log.info(`Copying default ${label} from: ${bundledDir}`);
  log.info(`Installing to: ${targetDir}`);

  await copyDirectory(bundledDir, targetDir, targetDir, label, fileFilter, alwaysOverwrite);

  log.info(`Default ${label} installation complete`);
}

async function copyDirectory(
  src: string,
  dest: string,
  baseDir: string,
  label: string,
  fileFilter?: (filename: string) => boolean,
  alwaysOverwrite?: (filename: string) => boolean,
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, baseDir, label, fileFilter, alwaysOverwrite);
    } else if (entry.isFile() && (!fileFilter || fileFilter(entry.name))) {
      const shouldOverwrite = alwaysOverwrite?.(entry.name) ?? false;

      try {
        await fs.access(destPath);

        if (shouldOverwrite) {
          await fs.copyFile(srcPath, destPath);
          log.info(`Updated system ${label.toLowerCase()}: ${relative(baseDir, destPath)}`);
        } else {
          log.info(`${label} already exists, skipping: ${entry.name}`);
        }
      } catch {
        await fs.copyFile(srcPath, destPath);
        log.info(
          `Installed default ${label.toLowerCase()}: ${relative(baseDir, destPath)}`,
        );
      }
    }
  }
}
