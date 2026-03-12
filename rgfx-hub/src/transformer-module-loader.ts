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
 * Rewrite relative import specifiers to absolute file:// URLs with content-hash
 * cache-busting. Returns null if no relative imports were found (no rewrite needed).
 */
export async function rewriteRelativeImports(
  filePath: string,
  content: string,
): Promise<string | null> {
  const dir = dirname(filePath);
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
  let result = content;
  const seen = new Set<string>();
  let didRewrite = false;

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
      const absoluteUrl = `${pathToFileURL(depPath).href}?v=${depHash}`;
      result = result.replaceAll(`'${specifier}'`, `'${absoluteUrl}'`);
      result = result.replaceAll(`"${specifier}"`, `"${absoluteUrl}"`);
      didRewrite = true;
    } catch {
      // Dependency doesn't exist — skip rewriting
    }
  }

  return didRewrite ? result : null;
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

    if (!rewritten) {
      const hash = createHash('sha1').update(content).digest('hex').slice(0, 12);
      const url = pathToFileURL(filePath).href;

      return (await import(`${url}?v=${hash}`)) as Record<string, unknown>;
    }

    // Relative imports rewritten to absolute file:// URLs — load via data URL
    // so no temp file is needed (avoids EPERM races on Windows).
    // Data URLs are never cached by Node's module loader, so no hash needed here.
    const encoded = Buffer.from(rewritten).toString('base64');

    return (await import(`data:text/javascript;base64,${encoded}`)) as Record<string, unknown>;
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
