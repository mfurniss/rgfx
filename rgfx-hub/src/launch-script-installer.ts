import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import log from 'electron-log/main';
import { CONFIG_DIRECTORY } from './config/paths';
import { getBundledAssetDir } from './utils/asset-installer';

const SCRIPT_FILENAMES: Record<string, string> = {
  darwin: 'launch-mame.sh',
  win32: 'launch-mame.bat',
};

const PLACEHOLDERS: Record<string, () => string> = {
  '{{RGFX_LUA_PATH}}': () => join(getBundledAssetDir('mame'), 'rgfx.lua'),
  '{{ROM_PATH}}': () => join(homedir(), 'mame-roms'),
};

export async function installLaunchScript(forceOverwrite = false): Promise<void> {
  const scriptFilename = SCRIPT_FILENAMES[process.platform];

  if (!scriptFilename) {
    log.info(`Launch script not available for platform: ${process.platform}`);
    return;
  }

  const targetPath = join(CONFIG_DIRECTORY, scriptFilename);

  if (!forceOverwrite) {
    // Skip if file already exists (preserves user edits)
    try {
      await fs.access(targetPath);
      log.info(`Launch script already exists, skipping: ${targetPath}`);
      return;
    } catch {
      // File doesn't exist — continue with installation
    }
  }

  const templatePath = join(getBundledAssetDir('scripts'), scriptFilename);
  log.info(`Installing launch script from: ${templatePath}`);

  let content = await fs.readFile(templatePath, 'utf-8');

  for (const [placeholder, resolve] of Object.entries(PLACEHOLDERS)) {
    content = content.replaceAll(placeholder, resolve());
  }

  await fs.mkdir(CONFIG_DIRECTORY, { recursive: true });
  await fs.writeFile(targetPath, content, 'utf-8');

  // Set executable permission on macOS
  if (process.platform === 'darwin') {
    await fs.chmod(targetPath, 0o755);
  }

  log.info(`Installed launch script: ${targetPath}`);
}
