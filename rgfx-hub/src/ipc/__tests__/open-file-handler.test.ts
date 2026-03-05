import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { openFile, registerOpenFileHandler } from '../open-file-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  shell: {
    openPath: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('openFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('file validation', () => {
    it('should throw error if file does not exist', async () => {
      const fs = await import('fs');
      (fs.existsSync as Mock).mockReturnValue(false);

      await expect(openFile('/path/to/nonexistent.txt')).rejects.toThrow(
        'File does not exist',
      );
    });

    it('should check if file exists before opening', async () => {
      const fs = await import('fs');
      const { shell } = await import('electron');
      (fs.existsSync as Mock).mockReturnValue(true);
      (shell.openPath as Mock).mockResolvedValue('');

      await openFile('/path/to/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.txt');
    });
  });

  describe('opening files', () => {
    it('should complete without throwing when file opens successfully', async () => {
      const fs = await import('fs');
      const { shell } = await import('electron');
      (fs.existsSync as Mock).mockReturnValue(true);
      (shell.openPath as Mock).mockResolvedValue('');

      await expect(openFile('/path/to/file.txt')).resolves.toBeUndefined();
    });

    it('should call shell.openPath with the file path', async () => {
      const fs = await import('fs');
      const { shell } = await import('electron');
      (fs.existsSync as Mock).mockReturnValue(true);
      (shell.openPath as Mock).mockResolvedValue('');

      await openFile('/path/to/file.txt');

      expect(shell.openPath).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should throw error when shell.openPath returns an error string', async () => {
      const fs = await import('fs');
      const { shell } = await import('electron');
      (fs.existsSync as Mock).mockReturnValue(true);
      (shell.openPath as Mock).mockResolvedValue('No application set to open this file type');

      await expect(openFile('/path/to/file.txt')).rejects.toThrow(
        'No application set to open this file type',
      );
    });
  });
});

describe('registerOpenFileHandler', () => {
  let registeredHandler: (event: unknown, filePath: string) => Promise<void>;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    ipc = await setupIpcHandlerCapture();

    registerOpenFileHandler();

    registeredHandler = ipc.getHandler('file:open') as typeof registeredHandler;
  });

  describe('handler registration', () => {
    it('should register handler for file:open channel', () => {
      ipc.assertChannel('file:open');
    });
  });

  describe('handler execution', () => {
    it('should call openFile with provided path', async () => {
      const fs = await import('fs');
      const { shell } = await import('electron');
      (fs.existsSync as Mock).mockReturnValue(true);
      (shell.openPath as Mock).mockResolvedValue('');

      await registeredHandler({}, '/path/to/file.txt');

      expect(shell.openPath).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should propagate errors from openFile', async () => {
      const fs = await import('fs');
      (fs.existsSync as Mock).mockReturnValue(false);

      await expect(registeredHandler({}, '/nonexistent/file.txt')).rejects.toThrow(
        'File does not exist',
      );
    });
  });
});
