import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import {
  createTransformerModuleLoader,
  rewriteRelativeImports,
} from '../transformer-module-loader';
import type { TransformerHandler } from '../types/transformer-types';

describe('createTransformerModuleLoader', () => {
  let mockImport: ReturnType<typeof vi.fn>;
  let mockLog: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockImport = vi.fn();
    mockLog = { error: vi.fn() };
  });

  it('should use custom importModule when provided', async () => {
    mockImport.mockResolvedValue({ transform: vi.fn() });
    const loader = createTransformerModuleLoader(mockImport, mockLog);

    await loader.importModule('/some/path.js');

    expect(mockImport).toHaveBeenCalledWith('/some/path.js');
  });

  it('should expose extractHandler on the returned loader', () => {
    const loader = createTransformerModuleLoader(mockImport, mockLog);

    expect(loader.extractHandler).toBeTypeOf('function');
  });

  it('should expose loadHandlersFromDir on the returned loader', () => {
    const loader = createTransformerModuleLoader(mockImport, mockLog);

    expect(loader.loadHandlersFromDir).toBeTypeOf('function');
  });

  describe('extractHandler', () => {
    let loader: ReturnType<typeof createTransformerModuleLoader>;

    beforeEach(() => {
      loader = createTransformerModuleLoader(mockImport, mockLog);
    });

    it('should extract named transform export', () => {
      const handler = vi.fn() as TransformerHandler;
      const result = loader.extractHandler({ transform: handler });

      expect(result).toBe(handler);
    });

    it('should extract default export with transform property', () => {
      const handler = vi.fn() as TransformerHandler;
      const result = loader.extractHandler({
        default: { transform: handler },
      });

      expect(result).toBe(handler);
    });

    it('should extract default export as function', () => {
      const handler = vi.fn() as TransformerHandler;
      const result = loader.extractHandler({ default: handler });

      expect(result).toBe(handler);
    });

    it('should prefer named export over default', () => {
      const named = vi.fn() as TransformerHandler;
      const defaultFn = vi.fn() as TransformerHandler;
      const result = loader.extractHandler({
        transform: named,
        default: defaultFn,
      });

      expect(result).toBe(named);
    });

    it('should return null for empty module', () => {
      expect(loader.extractHandler({})).toBeNull();
    });

    it('should return null when transform is not a function', () => {
      expect(loader.extractHandler({ transform: 'not a function' })).toBeNull();
    });

    it('should return null when default is non-function non-object', () => {
      expect(loader.extractHandler({ default: 42 })).toBeNull();
    });

    it('should return null when default.transform is not a function', () => {
      const result = loader.extractHandler({
        default: { transform: 'string' },
      });

      expect(result).toBeNull();
    });
  });

  describe('loadHandlersFromDir', () => {
    it('should pass the custom importModule to the loader', async () => {
      const handler = vi.fn() as TransformerHandler;
      mockImport.mockResolvedValue({ transform: handler });

      // Mock fs.readdir via the module — the loader calls fs.readdir internally.
      // Since we inject importModule, we can test the wiring without mocking fs.
      const { promises: fs } = await import('node:fs');
      vi.spyOn(fs, 'readdir').mockResolvedValue(['test.js'] as any);

      const loader = createTransformerModuleLoader(mockImport, mockLog);
      const handlers = await loader.loadHandlersFromDir('/mock/dir');

      expect(mockImport).toHaveBeenCalledWith(
        path.join('/mock/dir', 'test.js'),
      );
      expect(handlers.get('test')).toBe(handler);

      vi.restoreAllMocks();
    });

    it('should log errors via the injected logger', async () => {
      mockImport.mockRejectedValue(new Error('Import failed'));

      const { promises: fs } = await import('node:fs');
      vi.spyOn(fs, 'readdir').mockResolvedValue(['broken.js'] as any);

      const loader = createTransformerModuleLoader(mockImport, mockLog);
      await loader.loadHandlersFromDir('/mock/dir');

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to load transformer broken.js:',
        expect.any(Error),
      );

      vi.restoreAllMocks();
    });

    it('should use no-op logger when none provided', () => {
      const loader = createTransformerModuleLoader(mockImport);

      // Should not throw — default logger is a no-op
      expect(loader.loadHandlersFromDir).toBeTypeOf('function');
    });
  });

  describe('rewriteRelativeImports', () => {
    it('should return null when no relative imports exist', async () => {
      const result = await rewriteRelativeImports(
        '/app/transformers/test.js',
        'export function transform() { return 1; }',
      );

      expect(result).toBeNull();
    });

    it('should return null when relative import dependency does not exist', async () => {
      const { promises: fs } = await import('node:fs');
      vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'));

      const result = await rewriteRelativeImports(
        '/app/transformers/test.js',
        "import { foo } from './nonexistent.js';",
      );

      expect(result).toBeNull();
      vi.restoreAllMocks();
    });

    it('should rewrite relative imports to absolute file:// URLs with hashes', async () => {
      const depContent = 'export const x = 42;';
      const depHash = createHash('sha1')
        .update(depContent)
        .digest('hex')
        .slice(0, 12);

      const { promises: fs } = await import('node:fs');
      vi.spyOn(fs, 'readFile').mockResolvedValue(depContent);

      const filePath = path.resolve('/app/transformers/test.js');
      const result = await rewriteRelativeImports(
        filePath,
        "import { foo } from './utils.js';",
      );

      const expectedDepPath = path.resolve('/app/transformers/utils.js');
      const expectedUrl = `${pathToFileURL(expectedDepPath).href}?v=${depHash}`;

      expect(result).toBe(`import { foo } from '${expectedUrl}';`);
      vi.restoreAllMocks();
    });

    it('should handle double-quoted imports', async () => {
      const depContent = 'export const x = 1;';

      const { promises: fs } = await import('node:fs');
      vi.spyOn(fs, 'readFile').mockResolvedValue(depContent);

      const filePath = path.resolve('/app/transformers/test.js');
      const result = await rewriteRelativeImports(
        filePath,
        'import { bar } from "./global.js";',
      );

      expect(result).not.toBeNull();
      expect(result).toContain('file:///');
      expect(result).toContain('?v=');
      vi.restoreAllMocks();
    });

    it('should handle multiple relative imports', async () => {
      const { promises: fs } = await import('node:fs');
      vi.spyOn(fs, 'readFile').mockResolvedValue('export default 1;');

      const filePath = path.resolve('/app/transformers/test.js');
      const content = [
        "import { a } from './utils.js';",
        "import { b } from './global.js';",
      ].join('\n');

      const result = await rewriteRelativeImports(filePath, content);

      expect(result).not.toBeNull();
      // Both imports should be rewritten
      expect(result!.match(/file:\/\//g)).toHaveLength(2);
      vi.restoreAllMocks();
    });

    it('should deduplicate identical specifiers', async () => {
      const { promises: fs } = await import('node:fs');
      const readSpy = vi
        .spyOn(fs, 'readFile')
        .mockResolvedValue('export default 1;');

      const filePath = path.resolve('/app/transformers/test.js');
      const content = [
        "import { a } from './utils.js';",
        "import { b } from './utils.js';",
      ].join('\n');

      await rewriteRelativeImports(filePath, content);

      // readFile called once for the dependency, not twice
      expect(readSpy).toHaveBeenCalledTimes(1);
      vi.restoreAllMocks();
    });
  });
});
