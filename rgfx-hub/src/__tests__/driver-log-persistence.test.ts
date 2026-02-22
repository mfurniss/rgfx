import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriverLogPersistence } from '../driver-log-persistence';

const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockAppendFileSync = vi.fn();

vi.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  appendFileSync: (...args: unknown[]) => mockAppendFileSync(...args),
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DriverLogPersistence', () => {
  let persistence: DriverLogPersistence;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    persistence = new DriverLogPersistence('/home/user/.rgfx');
  });

  describe('getLogFilePath', () => {
    it('returns correct path for driver', () => {
      const result = persistence.getLogFilePath('rgfx-driver-0001');
      expect(result).toMatch(/logs[/\\]rgfx-driver-0001\.log$/);
    });

    it('returns different paths for different drivers', () => {
      const path1 = persistence.getLogFilePath('driver-a');
      const path2 = persistence.getLogFilePath('driver-b');
      expect(path1).not.toBe(path2);
    });
  });

  describe('appendLog', () => {
    it('creates logs directory when it does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      persistence.appendLog('driver-1', 'info', 'hello', 1700000000000);

      expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('logs'), { recursive: true });
    });

    it('does not create directory when it already exists', () => {
      mockExistsSync.mockReturnValue(true);

      persistence.appendLog('driver-1', 'info', 'hello', 1700000000000);

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('writes formatted log line with ISO timestamp', () => {
      persistence.appendLog('driver-1', 'info', 'Device started', 1700000000000);

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('driver-1.log'),
        expect.stringContaining('[2023-11-14T'),
        'utf8',
      );
    });

    it('uppercases the log level', () => {
      persistence.appendLog('driver-1', 'error', 'something broke', 1700000000000);

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('[ERROR]'),
        'utf8',
      );
    });

    it('includes the message in the log line', () => {
      persistence.appendLog('driver-1', 'info', 'WiFi connected', 1700000000000);

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('WiFi connected'),
        'utf8',
      );
    });

    it('ends log line with newline', () => {
      persistence.appendLog('driver-1', 'info', 'test', 1700000000000);

      const writtenContent = mockAppendFileSync.mock.calls[0][1] as string;
      expect(writtenContent.endsWith('\n')).toBe(true);
    });

    it('handles appendFileSync errors without throwing', () => {
      mockAppendFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        persistence.appendLog('driver-1', 'info', 'test', 1700000000000);
      }).not.toThrow();
    });

    it('writes to separate files per driver', () => {
      persistence.appendLog('driver-a', 'info', 'msg1', 1700000000000);
      persistence.appendLog('driver-b', 'info', 'msg2', 1700000000000);

      const file1 = mockAppendFileSync.mock.calls[0][0] as string;
      const file2 = mockAppendFileSync.mock.calls[1][0] as string;
      expect(file1).toContain('driver-a.log');
      expect(file2).toContain('driver-b.log');
    });
  });
});
