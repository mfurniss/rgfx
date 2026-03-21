import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import log from 'electron-log/main';
import { CONFIG_DIRECTORY } from './config/paths';

const SCRIPT_FILENAMES: Record<string, string> = {
  darwin: 'launch-mame.sh',
  win32: 'launch-mame.bat',
};

// Patterns to match the ROM_PATH line in each platform's script
const ROM_PATH_PATTERNS: Record<string, RegExp> = {
  darwin: /^ROM_PATH=".*"$/m,
  win32: /^set "ROM_PATH=.*"$/m,
};

const ROM_PATH_TEMPLATES: Record<string, (path: string) => string> = {
  darwin: (path: string) => `ROM_PATH="${path}"`,
  win32: (path: string) => `set "ROM_PATH=${path}"`,
};

/**
 * Updates only the ROM_PATH line in the existing launch script,
 * preserving all other user customizations.
 */
export async function updateLaunchScriptRomPath(romPath: string): Promise<void> {
  const scriptFilename = SCRIPT_FILENAMES[process.platform];

  if (!scriptFilename) {
    return;
  }

  const targetPath = join(CONFIG_DIRECTORY, scriptFilename);
  const pattern = ROM_PATH_PATTERNS[process.platform];
  const template = ROM_PATH_TEMPLATES[process.platform];

  let content = await fs.readFile(targetPath, 'utf-8');

  if (!pattern.test(content)) {
    log.warn(`ROM_PATH line not found in launch script: ${targetPath}`);
    return;
  }

  content = content.replace(pattern, template(romPath));
  await fs.writeFile(targetPath, content, 'utf-8');

  log.info(`Updated ROM path in launch script: ${romPath}`);
}
