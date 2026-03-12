import log from 'electron-log/main';
import { INTERCEPTORS_DIRECTORY } from './config/paths';
import {
  getBundledAssetDir,
  installBundledAssets,
} from './utils/asset-installer';

const isInstallableFile = (name: string): boolean =>
  name.endsWith('.lua') || name.endsWith('.json');

export async function installDefaultInterceptors(forceOverwrite = false): Promise<void> {
  try {
    await installBundledAssets({
      bundledDir: getBundledAssetDir('interceptors'),
      targetDir: INTERCEPTORS_DIRECTORY,
      label: 'interceptors',
      fileFilter: isInstallableFile,
      forceOverwrite,
    });
  } catch (error) {
    log.error('Failed to install default interceptors:', error);
    throw error;
  }
}
