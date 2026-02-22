import { homedir } from 'os';
import { resolve } from 'path';

/**
 * Expands ~ to the user's home directory
 */
export function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return resolve(homedir(), path.slice(1).replace(/^\//, ''));
  }
  return path;
}
