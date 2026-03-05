import { promises as fs } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import type { TransformerHandler } from './types/transformer-types';

export interface TransformerModuleLoader {
  importModule: (path: string) => Promise<Record<string, unknown>>;
  extractHandler: (module: Record<string, unknown>) => TransformerHandler | null;
  loadHandlersFromDir: (dir: string) => Promise<Map<string, TransformerHandler>>;
}

/**
 * Extract transform function from a transformer module.
 * Supports named export `transform`, default export with `.transform`,
 * or default export as a function.
 */
function extractHandler(module: Record<string, unknown>): TransformerHandler | null {
  if (typeof module.transform === 'function') {
    return module.transform as TransformerHandler;
  }

  const defaultExport = module.default as Record<string, unknown> | undefined;

  if (defaultExport && typeof defaultExport.transform === 'function') {
    return defaultExport.transform as TransformerHandler;
  }

  if (typeof defaultExport === 'function') {
    return defaultExport as TransformerHandler;
  }

  return null;
}

/**
 * Rewrite relative import specifiers with content-hash cache-busting.
 * Ensures dependencies are always loaded fresh from disk on hot reload.
 */
async function rewriteRelativeImports(filePath: string, content: string): Promise<string> {
  const dir = dirname(filePath);
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
  let result = content;
  const seen = new Set<string>();

  for (const match of content.matchAll(importRegex)) {
    const specifier = match[1];

    if (seen.has(specifier)) {
      continue;
    }

    seen.add(specifier);

    const depPath = resolve(dir, specifier);

    try {
      const depContent = await fs.readFile(depPath, 'utf-8');
      const depHash = createHash('sha1').update(depContent).digest('hex').slice(0, 12);
      result = result.replaceAll(`'${specifier}'`, `'${specifier}?v=${depHash}'`);
      result = result.replaceAll(`"${specifier}"`, `"${specifier}?v=${depHash}"`);
    } catch {
      // Dependency doesn't exist — skip rewriting
    }
  }

  return result;
}

/**
 * Create a production module importer with content-hash cache busting.
 * Relative imports are rewritten with dependency content hashes so shared
 * modules (global.js, utils/) are always loaded fresh after changes.
 */
function createProductionImporter(): (filePath: string) => Promise<Record<string, unknown>> {
  return async (filePath: string) => {
    const content = await fs.readFile(filePath, 'utf-8');
    const rewritten = await rewriteRelativeImports(filePath, content);
    const hash = createHash('sha1').update(rewritten).digest('hex').slice(0, 12);

    if (rewritten === content) {
      const url = pathToFileURL(filePath).href;
      return (await import(`${url}?v=${hash}`)) as Record<string, unknown>;
    }

    // Temp file in same directory preserves relative path resolution.
    // The .mjs extension is ignored by the file watcher (.js filter).
    const tempPath = join(dirname(filePath), `.rgfx-${hash}.mjs`);
    await fs.writeFile(tempPath, rewritten);

    try {
      const url = pathToFileURL(tempPath).href;

      return (await import(url)) as Record<string, unknown>;
    } finally {
      await fs.unlink(tempPath).catch(() => undefined);
    }
  };
}

/**
 * Load all .js handler files from a directory.
 * Returns a Map of filename (without extension) → handler.
 * Silently ignores ENOENT (directory doesn't exist).
 */
async function loadHandlersFromDir(
  dir: string,
  importModule: (path: string) => Promise<Record<string, unknown>>,
  log: { error: (msg: string, ...args: unknown[]) => void },
): Promise<Map<string, TransformerHandler>> {
  const handlers = new Map<string, TransformerHandler>();

  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      if (!file.endsWith('.js')) {
        continue;
      }

      const name = file.replace('.js', '');
      const filePath = join(dir, file);

      try {
        const module = await importModule(filePath);
        const handler = extractHandler(module);

        if (handler) {
          handlers.set(name, handler);
        }
      } catch (error) {
        log.error(`Failed to load transformer ${file}:`, error);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return handlers;
}

/**
 * Create a transformer module loader.
 * Pass a custom `importModule` for testing, or omit for production cache-busting.
 */
export function createTransformerModuleLoader(
  customImportModule?: (path: string) => Promise<Record<string, unknown>>,
  log: { error: (msg: string, ...args: unknown[]) => void } = { error: () => undefined },
): TransformerModuleLoader {
  const importModule = customImportModule ?? createProductionImporter();

  return {
    importModule,
    extractHandler,
    loadHandlersFromDir: (dir: string) => loadHandlersFromDir(dir, importModule, log),
  };
}
