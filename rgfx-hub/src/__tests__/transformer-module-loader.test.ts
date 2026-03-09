import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransformerModuleLoader } from '../transformer-module-loader';
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
});
