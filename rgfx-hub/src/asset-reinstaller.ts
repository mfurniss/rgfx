import log from 'electron-log/main';
import { installDefaultInterceptors } from './interceptor-installer';
import { installDefaultTransformers } from './transformer-installer';
import { installDefaultLedHardware } from './led-hardware-installer';
import { installLaunchScript } from './launch-script-installer';

/**
 * Reinstalls all bundled assets, overwriting any existing user files.
 */
export async function reinstallAllAssets(): Promise<void> {
  log.info('Reinstalling all default assets (force overwrite)');

  await installDefaultInterceptors(true);
  await installDefaultTransformers(true);
  await installDefaultLedHardware(true);
  await installLaunchScript(true);

  log.info('All default assets reinstalled successfully');
}
