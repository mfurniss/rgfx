import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import log from 'electron-log/main';
import { CONFIG_DIRECTORY } from './config/paths';

const SCRIPT_FILENAMES: Record<string, string> = {
  darwin: 'launch-mame.sh',
  win32: 'launch-mame.bat',
};

/** Builds a regex and replacement template for a given variable name per platform. */
function getVariableConfig(variableName: string) {
  const patterns: Record<string, RegExp> = {
    darwin: new RegExp(`^${variableName}=".*"$`, 'm'),
    win32: new RegExp(`^set "${variableName}=.*"$`, 'm'),
  };

  const templates: Record<string, (value: string) => string> = {
    darwin: (value: string) => `${variableName}="${value}"`,
    win32: (value: string) => `set "${variableName}=${value}"`,
  };

  return { patterns, templates };
}

/**
 * Updates a single variable line in the existing launch script,
 * preserving all other user customizations.
 */
export async function updateLaunchScriptVariable(
  variableName: string, value: string,
): Promise<void> {
  const scriptFilename = SCRIPT_FILENAMES[process.platform];

  if (!scriptFilename) {
    return;
  }

  const targetPath = join(CONFIG_DIRECTORY, scriptFilename);
  const { patterns, templates } = getVariableConfig(variableName);
  const pattern = patterns[process.platform];
  const template = templates[process.platform];

  let content = await fs.readFile(targetPath, 'utf-8');

  if (!pattern.test(content)) {
    log.warn(`${variableName} line not found in launch script: ${targetPath}`);
    return;
  }

  content = content.replace(pattern, template(value));
  await fs.writeFile(targetPath, content, 'utf-8');

  log.info(`Updated ${variableName} in launch script: ${value}`);
}

/**
 * Updates only the ROM_PATH line in the existing launch script.
 */
export async function updateLaunchScriptRomPath(romPath: string): Promise<void> {
  return updateLaunchScriptVariable('ROM_PATH', romPath);
}

/**
 * Updates only the MAME_PATH line in the existing launch script.
 */
export async function updateLaunchScriptMamePath(mamePath: string): Promise<void> {
  return updateLaunchScriptVariable('MAME_PATH', mamePath);
}
