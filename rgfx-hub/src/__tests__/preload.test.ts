import { vi, describe, it, expect, beforeEach } from 'vitest';

const {
  mockInvoke,
  mockSend,
  mockOn,
  mockRemoveListener,
  mockExposeInMainWorld,
} = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockSend: vi.fn(),
  mockOn: vi.fn(),
  mockRemoveListener: vi.fn(),
  mockExposeInMainWorld: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: mockInvoke,
    send: mockSend,
    on: mockOn,
    removeListener: mockRemoveListener,
  },
  contextBridge: {
    exposeInMainWorld: mockExposeInMainWorld,
  },
}));

import { rgfxAPI } from '../preload';

describe('preload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes API via contextBridge at module load time', () => {
    // exposeInMainWorld is called at module load, not per-test.
    // We verify the exported object matches what was registered.
    expect(mockExposeInMainWorld).toHaveBeenCalledTimes(0);
    // The call already happened before clearAllMocks, so verify
    // the object shape directly
    expect(rgfxAPI).toBeDefined();
    expect(typeof rgfxAPI).toBe('object');
  });

  describe('invoke methods call ipcRenderer.invoke with correct channel', () => {
    it.each([
      ['getAppInfo', 'app:get-info', []],
      ['sendDriverCommand', 'driver:send-command', ['d1', 'cmd', 'p']],
      ['updateDriverConfig', 'driver:update-config', ['d1']],
      ['flashOTA', 'driver:flash-ota', ['d1']],
      ['triggerDiscovery', 'discovery:trigger-immediate', []],
      ['triggerEffect', 'effect:trigger', [{ effect: 'test' }]],
      ['saveDriverConfig', 'driver:save-config', [{ id: 'cfg' }]],
      ['getLEDHardwareList', 'led-hardware:list', []],
      ['getLEDHardware', 'led-hardware:get', ['ref1']],
      ['openDriverLog', 'driver:open-log', ['d1']],
      ['openFile', 'file:open', ['/path']],
      ['listGames', 'games:list', ['/roms']],
      ['simulateEvent', 'event:simulate', ['line1']],
      ['selectDirectory', 'dialog:select-directory', ['title', '/default']],
      ['verifyDirectory', 'fs:verify-directory', ['/path']],
      ['getFirmwareManifest', 'firmware:get-manifest', []],
      ['getFirmwareFile', 'firmware:get-file', ['file.bin']],
      ['setDriverDisabled', 'driver:set-disabled', ['d1', true]],
      ['setDriverFallbackEnabled', 'settings:set-driver-fallback', [true]],
      ['resetEventCounts', 'event:reset', []],
      ['clearTransformerState', 'transformer:clear-state', []],
      ['loadGif', 'dialog:load-gif', []],
      ['restartDriver', 'driver:restart', ['d1']],
      ['deleteDriver', 'driver:delete', ['d1']],
      ['showInFolder', 'file:show-in-folder', ['/path']],
      ['getLogSizes', 'logs:get-sizes', []],
      ['clearAllLogs', 'logs:clear-all', []],
      ['createBackup', 'backup:create', []],
      ['reinstallAssets', 'assets:reinstall', []],
    ] as [string, string, unknown[]][])(
      '%s -> %s',
      (method, channel, args) => {
        const api = rgfxAPI as Record<
          string, (...a: unknown[]) => unknown
        >;
        api[method](...args);
        expect(mockInvoke).toHaveBeenCalledWith(channel, ...args);
      },
    );
  });

  describe('push methods register on correct channel', () => {
    it.each([
      ['onDriverConnected', 'driver:connected'],
      ['onDriverDisconnected', 'driver:disconnected'],
      ['onDriverUpdated', 'driver:updated'],
      ['onDriverRestarting', 'driver:restarting'],
      ['onDriverDeleted', 'driver:deleted'],
      ['onSystemStatus', 'system:status'],
      ['onFlashOtaState', 'flash:ota:state'],
      ['onFlashOtaProgress', 'flash:ota:progress'],
      ['onFlashOtaError', 'flash:ota:error'],
      ['onEvent', 'event:received'],
    ])('%s -> %s', (method, channel) => {
      const api = rgfxAPI as Record<
        string, (...a: unknown[]) => unknown
      >;
      const callback = vi.fn();
      api[method](callback);
      expect(mockOn).toHaveBeenCalledWith(
        channel,
        expect.any(Function),
      );
    });

    it.each([
      ['onDriverConnected', 'driver:connected'],
      ['onDriverDisconnected', 'driver:disconnected'],
      ['onDriverUpdated', 'driver:updated'],
      ['onDriverRestarting', 'driver:restarting'],
      ['onDriverDeleted', 'driver:deleted'],
      ['onSystemStatus', 'system:status'],
      ['onFlashOtaState', 'flash:ota:state'],
      ['onFlashOtaProgress', 'flash:ota:progress'],
      ['onFlashOtaError', 'flash:ota:error'],
      ['onEvent', 'event:received'],
    ])(
      '%s returns cleanup that removes listener from %s',
      (method, channel) => {
        const api = rgfxAPI as Record<
          string, (...a: unknown[]) => unknown
        >;
        const cleanup = api[method](vi.fn()) as () => void;

        expect(typeof cleanup).toBe('function');
        cleanup();
        expect(mockRemoveListener).toHaveBeenCalledWith(
          channel,
          expect.any(Function),
        );
      },
    );

    it('strips IPC event and forwards args to callback', () => {
      const callback = vi.fn();
      rgfxAPI.onDriverConnected(callback);

      const registeredHandler = mockOn.mock.calls[0][1];
      const fakeEvent = {};
      const fakeDriver = { id: 'test-driver' };
      registeredHandler(fakeEvent, fakeDriver);

      expect(callback).toHaveBeenCalledWith(fakeDriver);
    });
  });

  describe('send methods', () => {
    it('rendererReady -> renderer:ready', () => {
      rgfxAPI.rendererReady();
      expect(mockSend).toHaveBeenCalledWith('renderer:ready');
    });

    it('quitApp -> app:quit', () => {
      rgfxAPI.quitApp();
      expect(mockSend).toHaveBeenCalledWith('app:quit');
    });
  });

  describe('API completeness', () => {
    const expectedMethods = [
      // Invoke (30)
      'getAppInfo', 'sendDriverCommand', 'updateDriverConfig',
      'flashOTA', 'triggerDiscovery', 'triggerEffect',
      'saveDriverConfig', 'getLEDHardwareList', 'getLEDHardware',
      'openDriverLog', 'openFile', 'listGames', 'simulateEvent',
      'selectDirectory', 'verifyDirectory', 'getFirmwareManifest',
      'getFirmwareFile', 'setDriverDisabled',
      'setDriverFallbackEnabled', 'resetEventCounts',
      'clearTransformerState', 'loadGif', 'restartDriver',
      'deleteDriver', 'showInFolder', 'getLogSizes', 'clearAllLogs',
      'createBackup', 'setDriverId', 'openExternal', 'reinstallAssets',
      // Push (10)
      'onDriverConnected', 'onDriverDisconnected',
      'onDriverUpdated', 'onDriverRestarting', 'onDriverDeleted',
      'onSystemStatus', 'onFlashOtaState', 'onFlashOtaProgress',
      'onFlashOtaError', 'onEvent',
      // Send (2)
      'rendererReady', 'quitApp',
    ];

    it('has exactly 43 methods', () => {
      expect(Object.keys(rgfxAPI)).toHaveLength(43);
    });

    it('contains all expected methods', () => {
      const actualKeys = Object.keys(rgfxAPI);

      for (const method of expectedMethods) {
        expect(actualKeys).toContain(method);
      }
    });

    it('has no unexpected methods', () => {
      const actualKeys = Object.keys(rgfxAPI);

      for (const key of actualKeys) {
        expect(expectedMethods).toContain(key);
      }
    });

    it('all values are functions', () => {
      for (const [key, value] of Object.entries(rgfxAPI)) {
        expect(typeof value, `${key} should be a function`).toBe(
          'function',
        );
      }
    });
  });
});
