import log from 'electron-log/main';
import { LED_HARDWARE_DIRECTORY } from './config/paths';
import {
  getBundledAssetDir,
  installBundledAssets,
} from './utils/asset-installer';

const isJsonFile = (name: string): boolean => name.endsWith('.json');

export async function installDefaultLedHardware(forceOverwrite = false): Promise<void> {
  try {
    await installBundledAssets({
      bundledDir: getBundledAssetDir('led-hardware'),
      targetDir: LED_HARDWARE_DIRECTORY,
      label: 'LED hardware configs',
      fileFilter: isJsonFile,
      forceOverwrite,
    });
  } catch (error) {
    log.error('Failed to install LED hardware:', error);
    throw error;
  }
}
