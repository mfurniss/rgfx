/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';
import type { GameInfo } from '../types';
import { CONFIG_DIRECTORY } from '../config/paths';
import { expandPath } from '../utils/expand-path';
import { ROM_EXTENSIONS } from '../config/constants';

function getRomBaseName(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  if (ROM_EXTENSIONS.includes(ext)) {
    return path.basename(filename, ext);
  }

  return filename;
}

function parseRomMap(romMapPath: string): Map<string, string> {
  const map = new Map<string, string>();

  if (!fs.existsSync(romMapPath)) {
    return map;
  }

  const content = fs.readFileSync(romMapPath, 'utf-8');

  // Extract key-value pairs from rom_map.lua
  // Format: key = "interceptor_name" or ["key with spaces"] = "interceptor_name"
  const entryRegex = /(?:\["([^"]+)"\]|(\w+))\s*=\s*"([^"]+)"/g;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const key = match[1] || match[2];
    const interceptor = match[3];
    map.set(key, interceptor);
  }

  return map;
}

export function registerListGamesHandler(): void {
  ipcMain.handle('games:list', (_event, romsDirectory?: string): GameInfo[] => {
    try {
      const interceptorsDir = path.join(CONFIG_DIRECTORY, 'interceptors', 'games');
      const transformersDir = path.join(CONFIG_DIRECTORY, 'transformers', 'games');
      const romMapPath = path.join(CONFIG_DIRECTORY, 'interceptors', 'rom_map.lua');

      // Parse rom_map for alias resolution
      const romMap = parseRomMap(romMapPath);
      const games: GameInfo[] = [];
      const seenInterceptors = new Set<string>();

      // If ROMs directory is configured, scan ROM files
      const expandedRomsDir = romsDirectory ? expandPath(romsDirectory) : undefined;

      if (expandedRomsDir && fs.existsSync(expandedRomsDir)) {
        const romFiles = fs.readdirSync(expandedRomsDir).filter((f) => {
          const ext = path.extname(f).toLowerCase();
          return ROM_EXTENSIONS.includes(ext);
        });

        for (const romFile of romFiles) {
          const romBaseName = getRomBaseName(romFile);

          // 1. Check rom_map for alias, 2. Fall back to 1-1 mapping
          const mappedInterceptor = romMap.get(romBaseName);
          const interceptorName = mappedInterceptor
            ? `${mappedInterceptor}.lua`
            : `${romBaseName}_rgfx.lua`;
          const interceptorPath = path.join(interceptorsDir, interceptorName);
          const interceptorExists = fs.existsSync(interceptorPath);

          // Transformer uses interceptor base name (e.g., pacman_rgfx -> pacman.js)
          const interceptorBaseName = mappedInterceptor
            ? mappedInterceptor.replace(/_rgfx$/, '')
            : romBaseName;
          const transformerName = `${interceptorBaseName}.js`;
          const transformerPath = path.join(transformersDir, transformerName);
          const transformerExists = fs.existsSync(transformerPath);

          if (interceptorExists) {
            seenInterceptors.add(interceptorName);
          }

          games.push({
            romName: romFile,
            interceptorPath: interceptorExists ? interceptorPath : null,
            interceptorName: interceptorExists ? interceptorName : null,
            transformerPath: transformerExists ? transformerPath : null,
            transformerName: transformerExists ? transformerName : null,
          });
        }
      }

      // Also scan interceptors directory for games not in ROMs
      if (fs.existsSync(interceptorsDir)) {
        const interceptorFiles = fs.readdirSync(interceptorsDir).filter(
          (f) => f.endsWith('_rgfx.lua') && !seenInterceptors.has(f),
        );

        for (const interceptorFile of interceptorFiles) {
          const interceptorBaseName = interceptorFile.replace(/_rgfx\.lua$/, '');
          const transformerName = `${interceptorBaseName}.js`;
          const transformerPath = path.join(transformersDir, transformerName);
          const transformerExists = fs.existsSync(transformerPath);

          games.push({
            romName: null,
            interceptorPath: path.join(interceptorsDir, interceptorFile),
            interceptorName: interceptorFile,
            transformerPath: transformerExists ? transformerPath : null,
            transformerName: transformerExists ? transformerName : null,
          });
        }
      }

      log.info(`Listed ${games.length} games`);
      return games;
    } catch (error) {
      log.error('Failed to list games:', error);
      return [];
    }
  });
}
