import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockLog, mockInitialize } = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
  mockLog: {
    initialize: vi.fn(),
    transports: {
      console: { level: 'info' as string },
      file: { level: 'info' as string },
    },
  },
}));

vi.mock('electron-log/main', () => {
  mockLog.initialize = mockInitialize;
  return { default: mockLog };
});

describe('initializeLogging', () => {
  const originalEnv = process.env.LOG_LEVEL;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Reset transport levels
    mockLog.transports.console.level = 'info';
    mockLog.transports.file.level = 'info';
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.LOG_LEVEL = originalEnv;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });

  it('should call log.initialize()', async () => {
    const { initializeLogging } = await import('../logging.js');

    initializeLogging();

    expect(mockInitialize).toHaveBeenCalled();
  });

  it('should default to info log level', async () => {
    const { initializeLogging } = await import('../logging.js');

    initializeLogging();

    expect(mockLog.transports.console.level).toBe('info');
    expect(mockLog.transports.file.level).toBe('info');
  });

  it('should use LOG_LEVEL env var when set', async () => {
    process.env.LOG_LEVEL = 'debug';

    const { initializeLogging } = await import('../logging.js');

    initializeLogging();

    expect(mockLog.transports.console.level).toBe('debug');
    expect(mockLog.transports.file.level).toBe('debug');
  });

  it('should configure both console and file transports', async () => {
    process.env.LOG_LEVEL = 'warn';

    const { initializeLogging } = await import('../logging.js');

    initializeLogging();

    expect(mockLog.transports.console.level).toBe('warn');
    expect(mockLog.transports.file.level).toBe('warn');
  });

  it('should return the log instance', async () => {
    const { initializeLogging } = await import('../logging.js');

    const result = initializeLogging();

    expect(result).toBe(mockLog);
  });
});
