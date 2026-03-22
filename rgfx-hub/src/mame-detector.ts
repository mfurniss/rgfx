import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { join as posixJoin } from 'node:path/posix';
import { join as win32Join } from 'node:path/win32';
import log from 'electron-log/main';

const PLATFORM_CONFIG: Record<string, {
  exeName: string;
  join: typeof posixJoin;
  candidates: () => string[];
}> = {
  darwin: {
    exeName: 'mame',
    join: posixJoin,
    candidates: () => [
      'mame',
      posixJoin(homedir(), 'mame', 'mame'),
      '/opt/homebrew/bin/mame',
      '/usr/local/bin/mame',
    ],
  },
  win32: {
    exeName: 'mame.exe',
    join: win32Join,
    candidates: () => [
      'mame',
      win32Join(homedir(), 'mame', 'mame.exe'),
      'C:\\mame\\mame.exe',
    ],
  },
};

function parseVersion(stdout: string): string | null {
  const match = /^(\d+\.\d+)/.exec(stdout.trim());
  return match?.[1] ?? null;
}

function tryExec(binary: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(binary, ['-version'], { timeout: 5_000 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(parseVersion(stdout));
    });
  });
}

/**
 * Detect MAME version by executing the binary with -version.
 * If mameDirectory is provided, looks for the exe there.
 * If empty, tries common install paths and PATH.
 * Returns version string (e.g. "0.286") or null if not found.
 */
export async function detectMameVersion(
  mameDirectory: string,
): Promise<string | null> {
  const config = PLATFORM_CONFIG[process.platform];

  if (mameDirectory) {
    const binary = config.join(mameDirectory, config.exeName);
    const version = await tryExec(binary);

    if (version) {
      log.info(`MAME ${version} detected at: ${binary}`);
    } else {
      log.warn(`MAME not found at: ${binary}`);
    }
    return version;
  }

  // Auto-detect from common locations
  for (const candidate of config.candidates()) {
    const version = await tryExec(candidate);

    if (version) {
      log.info(`MAME ${version} detected at: ${candidate}`);
      return version;
    }
  }

  log.warn('MAME not detected in any common location');
  return null;
}
