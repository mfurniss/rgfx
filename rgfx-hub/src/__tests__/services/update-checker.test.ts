import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isNewerVersion, checkForUpdate } from '../../services/update-checker';

vi.mock('electron', () => ({
  app: { isPackaged: true },
  ipcMain: { handle: vi.fn() },
}));

describe('isNewerVersion', () => {
  it('returns true when latest is newer (patch)', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true);
  });

  it('returns true when latest is newer (minor)', () => {
    expect(isNewerVersion('1.0.3', '1.1.0')).toBe(true);
  });

  it('returns true when latest is newer (major)', () => {
    expect(isNewerVersion('1.9.9', '2.0.0')).toBe(true);
  });

  it('returns false when versions are equal', () => {
    expect(isNewerVersion('1.0.3', '1.0.3')).toBe(false);
  });

  it('returns false when current is newer', () => {
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false);
  });

  it('handles v prefix on latest', () => {
    expect(isNewerVersion('1.0.0', 'v1.0.1')).toBe(true);
  });

  it('handles v prefix on current', () => {
    expect(isNewerVersion('v1.0.0', '1.0.1')).toBe(true);
  });

  it('handles prerelease versions', () => {
    expect(isNewerVersion('1.0.0-dev', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.0.0-dev')).toBe(false);
  });

  it('handles build metadata', () => {
    expect(isNewerVersion('1.0.0-dev+abc123', '1.0.1')).toBe(true);
    expect(isNewerVersion('1.0.1', '1.0.0-dev+abc123')).toBe(false);
  });

  it('returns false for invalid versions', () => {
    expect(isNewerVersion('not-a-version', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', 'not-a-version')).toBe(false);
  });
});

describe('checkForUpdate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns release URL when newer version exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tag_name: 'v2.0.0',
        html_url: 'https://github.com/mfurniss/rgfx/releases/tag/v2.0.0',
      }),
    }));

    const result = await checkForUpdate('1.0.3');
    expect(result).toBe('https://github.com/mfurniss/rgfx/releases/tag/v2.0.0');
  });

  it('returns null when current version is latest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tag_name: 'v1.0.3',
        html_url: 'https://github.com/mfurniss/rgfx/releases/tag/v1.0.3',
      }),
    }));

    const result = await checkForUpdate('1.0.3');
    expect(result).toBeNull();
  });

  it('returns null when current version is newer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tag_name: 'v1.0.0',
        html_url: 'https://github.com/mfurniss/rgfx/releases/tag/v1.0.0',
      }),
    }));

    const result = await checkForUpdate('1.0.3');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      new Error('network error'),
    ));

    const result = await checkForUpdate('1.0.3');
    expect(result).toBeNull();
  });

  it('returns null on non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const result = await checkForUpdate('1.0.3');
    expect(result).toBeNull();
  });

  it('returns null when response is missing tag_name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));

    const result = await checkForUpdate('1.0.3');
    expect(result).toBeNull();
  });

  it('returns null when app is not packaged', async () => {
    const { app } = await import('electron');
    Object.defineProperty(app, 'isPackaged', { value: false });

    const result = await checkForUpdate('1.0.3');
    expect(result).toBeNull();

    Object.defineProperty(app, 'isPackaged', { value: true });
  });
});
