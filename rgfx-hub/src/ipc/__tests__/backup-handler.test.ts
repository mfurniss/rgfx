import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { registerBackupHandler } from '../backup-handler';

const mockLogInfo = vi.fn();
const mockLogError = vi.fn();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
}));

vi.mock('child_process', () => {
  const mock = { execFile: vi.fn() };

  return { ...mock, default: mock };
});

vi.mock('electron-log/main', () => ({
  default: {
    info: (...args: unknown[]) => mockLogInfo(...args),
    error: (...args: unknown[]) => mockLogError(...args),
  },
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '2025-06-15'),
}));

vi.mock('../../config/paths', () => ({
  CONFIG_DIRECTORY: '/mock/.rgfx',
}));

describe('registerBackupHandler', () => {
  let handler: (...args: unknown[]) => Promise<{ success: boolean; error?: string }>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as Mock).mockImplementation(
      (_channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
        handler = fn as typeof handler;
      },
    );

    registerBackupHandler();
  });

  it('registers handler for backup:create channel', async () => {
    const { ipcMain } = await import('electron');

    expect(ipcMain.handle).toHaveBeenCalledWith('backup:create', expect.any(Function));
  });

  it('opens save dialog with date-stamped default filename', async () => {
    const { dialog } = await import('electron');
    (dialog.showSaveDialog as Mock).mockResolvedValue({ canceled: true });

    await handler({});

    expect(dialog.showSaveDialog).toHaveBeenCalledWith({
      title: 'Save RGFX Backup',
      defaultPath: 'rgfx-backup-2025-06-15.zip',
      filters: [{ name: 'Zip Archives', extensions: ['zip'] }],
    });
  });

  it('returns { success: false } when user cancels dialog', async () => {
    const { dialog } = await import('electron');
    (dialog.showSaveDialog as Mock).mockResolvedValue({ canceled: true });

    const result = await handler({});

    expect(result).toEqual({ success: false });
  });

  it('returns { success: false } when filePath is empty', async () => {
    const { dialog } = await import('electron');
    (dialog.showSaveDialog as Mock).mockResolvedValue({ canceled: false, filePath: '' });

    const result = await handler({});

    expect(result).toEqual({ success: false });
  });

  it('calls zip with correct args on macOS', async () => {
    const { dialog } = await import('electron');
    const { execFile } = await import('child_process');

    (dialog.showSaveDialog as Mock).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/backup.zip',
    });

    (execFile as unknown as Mock).mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) => {
        cb(null);
      },
    );

    const result = await handler({});

    expect(execFile).toHaveBeenCalledWith(
      'zip',
      ['-r', '/tmp/backup.zip', '.'],
      { cwd: '/mock/.rgfx' },
      expect.any(Function),
    );
    expect(result).toEqual({ success: true });
  });

  it('returns error when zip fails with stderr', async () => {
    const { dialog } = await import('electron');
    const { execFile } = await import('child_process');

    (dialog.showSaveDialog as Mock).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/backup.zip',
    });

    (execFile as unknown as Mock).mockImplementation(
      (
        _cmd: string, _args: string[], _opts: unknown,
        cb: (err: Error, stdout: string, stderr: string) => void,
      ) => {
        cb(new Error('zip not found'), '', 'zip: command not found');
      },
    );

    const result = await handler({});

    expect(result).toEqual({ success: false, error: 'zip: command not found' });
  });

  it('uses error.message as fallback when stderr is empty', async () => {
    const { dialog } = await import('electron');
    const { execFile } = await import('child_process');

    (dialog.showSaveDialog as Mock).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/backup.zip',
    });

    (execFile as unknown as Mock).mockImplementation(
      (
        _cmd: string, _args: string[], _opts: unknown,
        cb: (err: Error, stdout: string, stderr: string) => void,
      ) => {
        cb(new Error('spawn ENOENT'), '', '');
      },
    );

    const result = await handler({});

    expect(result).toEqual({ success: false, error: 'spawn ENOENT' });
  });

  it('logs on successful backup', async () => {
    const { dialog } = await import('electron');
    const { execFile } = await import('child_process');

    (dialog.showSaveDialog as Mock).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/backup.zip',
    });

    (execFile as unknown as Mock).mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) => {
        cb(null);
      },
    );

    await handler({});

    expect(mockLogInfo).toHaveBeenCalledWith('Backup saved to /tmp/backup.zip');
  });

  it('logs on failed backup', async () => {
    const { dialog } = await import('electron');
    const { execFile } = await import('child_process');

    (dialog.showSaveDialog as Mock).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/backup.zip',
    });

    const zipError = new Error('disk full');
    (execFile as unknown as Mock).mockImplementation(
      (
        _cmd: string, _args: string[], _opts: unknown,
        cb: (err: Error, stdout: string, stderr: string) => void,
      ) => {
        cb(zipError, '', '');
      },
    );

    await handler({});

    expect(mockLogError).toHaveBeenCalledWith('Backup failed: disk full', zipError);
  });
});
