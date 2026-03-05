import log from 'electron-log/main';
import { TRANSFORMERS_DIRECTORY } from './config/paths';
import {
  getBundledAssetDir,
  installBundledAssets,
} from './utils/asset-installer';

export function getTransformersDir(): string {
  return TRANSFORMERS_DIRECTORY;
}

export async function installDefaultTransformers(): Promise<void> {
  try {
    await installBundledAssets({
      bundledDir: getBundledAssetDir('transformers'),
      targetDir: TRANSFORMERS_DIRECTORY,
      label: 'transformers',
    });
  } catch (error) {
    log.error('Failed to install default transformers:', error);
    throw error;
  }
}
