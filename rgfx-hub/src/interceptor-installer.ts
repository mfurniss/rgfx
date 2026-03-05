import log from 'electron-log/main';
import { INTERCEPTORS_DIRECTORY } from './config/paths';
import {
  getBundledAssetDir,
  installBundledAssets,
} from './utils/asset-installer';

/** Files that should not be copied to user config (e.g. LSP type stubs) */
const EXCLUDED_FILES = new Set(['mame.lua']);

const isInstallableLuaFile = (name: string): boolean =>
  name.endsWith('.lua') && !EXCLUDED_FILES.has(name);

export async function installDefaultInterceptors(): Promise<void> {
  try {
    await installBundledAssets({
      bundledDir: getBundledAssetDir('interceptors'),
      targetDir: INTERCEPTORS_DIRECTORY,
      label: 'interceptors',
      fileFilter: isInstallableLuaFile,
    });
  } catch (error) {
    log.error('Failed to install default interceptors:', error);
    throw error;
  }
}
