import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectMameVersion } from '@/mame-detector';

const { mockExecFile, mockLogInfo, mockLogWarn } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogWarn: vi.fn(),
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: mockLogInfo,
    warn: mockLogWarn,
    error: vi.fn(),
  },
}));

vi.mock('node:child_process', () => ({
  default: { execFile: mockExecFile },
  execFile: mockExecFile,
}));

type ExecCb = (...args: unknown[]) => void;

function withPlatform(platform: string, fn: () => Promise<void>) {
  return async () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: platform, configurable: true });

    try {
      await fn();
    } finally {
      Object.defineProperty(process, 'platform', { value: original, configurable: true });
    }
  };
}

describe('detectMameVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with explicit directory', () => {
    it('detects version from specified directory on macOS', withPlatform('darwin', async () => {
      mockExecFile.mockImplementation((_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb(null, '0.286 (unknown)\n');
      });

      const version = await detectMameVersion('/opt/homebrew');

      expect(version).toBe('0.286');
      expect(mockExecFile).toHaveBeenCalledWith(
        '/opt/homebrew/mame',
        ['-version'],
        expect.any(Object),
        expect.any(Function),
      );
    }));

    it('detects version from specified directory on Windows', withPlatform('win32', async () => {
      mockExecFile.mockImplementation((_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb(null, '0.286 (mame0286)\n');
      });

      const version = await detectMameVersion('F:\\Mame');

      expect(version).toBe('0.286');
      expect(mockExecFile).toHaveBeenCalledWith(
        'F:\\Mame\\mame.exe',
        ['-version'],
        expect.any(Object),
        expect.any(Function),
      );
    }));

    it('returns null when binary not found', withPlatform('darwin', async () => {
      mockExecFile.mockImplementation((_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb(new Error('ENOENT'));
      });

      const version = await detectMameVersion('/nonexistent');

      expect(version).toBeNull();
      expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('not found'));
    }));

    it('returns null when output is unparseable', withPlatform('darwin', async () => {
      mockExecFile.mockImplementation((_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb(null, 'not a version string');
      });

      const version = await detectMameVersion('/opt/homebrew');

      expect(version).toBeNull();
    }));
  });

  describe('auto-detect (empty directory)', () => {
    it('tries candidates sequentially until one succeeds', withPlatform('darwin', async () => {
      let callCount = 0;

      mockExecFile.mockImplementation((_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        callCount++;

        if (callCount === 1) {
          cb(new Error('ENOENT'));
        } else {
          cb(null, '0.285 (mame0285)\n');
        }
      });

      const version = await detectMameVersion('');

      expect(version).toBe('0.285');
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    }));

    it('returns null when no candidates succeed', withPlatform('darwin', async () => {
      mockExecFile.mockImplementation((_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb(new Error('ENOENT'));
      });

      const version = await detectMameVersion('');

      expect(version).toBeNull();
      expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('not detected'));
    }));
  });
});
