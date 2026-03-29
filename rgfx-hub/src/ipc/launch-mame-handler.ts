import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import { join, extname } from 'pathe';
import log from 'electron-log/main';
import { SEND_CHANNELS } from './contract';
import { CONFIG_DIRECTORY } from '@/config/paths';
import { ROM_EXTENSIONS } from '@/config/constants';
import { getZipInnerExtension } from '@/utils/zip-utils';

function getMameSystem(ext: string): string | undefined {
  return Object.entries(ROM_EXTENSIONS).find(([, exts]) => exts.includes(ext))?.[0];
}

export async function buildMameArgs(romPath: string): Promise<string[]> {
  const ext = extname(romPath).toLowerCase();

  if (ext === '.zip') {
    const innerExt = await getZipInnerExtension(romPath);
    const system = innerExt ? getMameSystem(innerExt) : undefined;

    return system ? [system, '-cart', romPath] : [romPath];
  }

  const system = getMameSystem(ext);

  return system ? [system, '-cart', romPath] : [romPath];
}

export function registerLaunchMameHandler(): void {
  ipcMain.on(SEND_CHANNELS.launchMame, (_event, romPath: string) => {
    const isWindows = process.platform === 'win32';
    const scriptName = isWindows ? 'launch-mame.bat' : 'launch-mame.sh';
    const scriptPath = join(CONFIG_DIRECTORY, scriptName);

    void buildMameArgs(romPath).then((args) => {
      log.info(`Launching MAME: ${JSON.stringify(args)}`);

      const child = isWindows
        ? spawn('cmd.exe', ['/c', scriptPath, ...args], { detached: true })
        : spawn(scriptPath, args, { detached: true });

      child.stdout.on('data', (data: Buffer) => {
        const s = data.toString().trim();

        if (s) {
          log.info(`MAME: ${s}`);
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const s = data.toString().trim();

        if (s) {
          log.error(`MAME: ${s}`);
        }
      });

      child.on('error', (err) => {
        log.error(`Failed to launch MAME ${JSON.stringify(args)}`);
        log.error(err);
      });

      child.unref();
    });
  });
}
