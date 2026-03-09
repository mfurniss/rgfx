import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServiceStartupDeps } from '../service-startup';
import type { AppServices } from '../service-factory';
import type { WindowManager } from '../../window/window-manager';
import type { SystemErrorTracker } from '../system-error-tracker';
import type { EventStats } from '../event-stats';
import { IPC } from '../../config/ipc-channels';

// Mock Electron
const mockPowerSaveBlocker = {
  start: vi.fn().mockReturnValue(42),
  stop: vi.fn(),
  isStarted: vi.fn().mockReturnValue(true),
};

vi.mock('electron', () => ({
  powerSaveBlocker: mockPowerSaveBlocker,
}));

// Mock all registration functions
const mockRegisterIpcHandlers = vi.fn();
const mockRegisterMqttSubscriptions = vi.fn();
const mockSetupDriverEventHandlers = vi.fn();
const mockInstallDefaultTransformers = vi.fn().mockResolvedValue(undefined);
const mockInstallDefaultInterceptors = vi.fn().mockResolvedValue(undefined);
const mockInstallDefaultLedHardware = vi.fn().mockResolvedValue(undefined);

vi.mock('../../ipc', () => ({
  registerIpcHandlers: mockRegisterIpcHandlers,
}));

vi.mock('../../mqtt-subscriptions', () => ({
  registerMqttSubscriptions: mockRegisterMqttSubscriptions,
}));

vi.mock('../../driver-callbacks', () => ({
  setupDriverEventHandlers: mockSetupDriverEventHandlers,
}));

vi.mock('../../transformer-installer', () => ({
  installDefaultTransformers: mockInstallDefaultTransformers,
}));

vi.mock('../../interceptor-installer', () => ({
  installDefaultInterceptors: mockInstallDefaultInterceptors,
}));

vi.mock('../../led-hardware-installer', () => ({
  installDefaultLedHardware: mockInstallDefaultLedHardware,
}));

const mockDriverConnectService = { onDriverConnected: vi.fn() };
vi.mock('../driver-connect-service', () => ({
  createDriverConnectService: vi.fn(() => mockDriverConnectService),
}));

vi.mock('../event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

describe('startServices', () => {
  let mockServices: AppServices;
  let mockWindowManager: WindowManager;
  let mockSystemErrorTracker: SystemErrorTracker;
  let mockEventStats: EventStats;
  let mockLog: ServiceStartupDeps['log'];
  let deps: ServiceStartupDeps;

  beforeEach(() => {
    vi.clearAllMocks();

    mockServices = {
      mqtt: { start: vi.fn() },
      driverRegistry: { startConnectionMonitor: vi.fn() },
      driverConfig: {},
      driverLogPersistence: {},
      ledHardwareManager: {},
      systemMonitor: {
        startFirmwareMonitoring: vi.fn(),
        startUpdateChecker: vi.fn(),
        registerStatusSources: vi.fn(),
      },
      transformerEngine: {
        loadTransformers: vi.fn().mockResolvedValue(undefined),
        handleEvent: vi.fn(),
      },
      eventReader: { start: vi.fn(), getFileSizeBytes: vi.fn().mockReturnValue(0) },
      networkManager: {},
      udpClient: {},
      uploadConfigToDriver: vi.fn(),
    } as unknown as AppServices;

    mockWindowManager = {
      getWindow: vi.fn().mockReturnValue({}),
      sendEventToRenderer: vi.fn(),
      sendSystemStatus: vi.fn(),
    } as unknown as WindowManager;

    mockSystemErrorTracker = {
      errors: [],
      hasCriticalError: vi.fn().mockReturnValue(false),
      addError: vi.fn(),
    };

    mockEventStats = {
      getCount: vi.fn().mockReturnValue(0),
      increment: vi.fn(),
      reset: vi.fn(),
    };

    mockLog = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as never;

    deps = {
      services: mockServices,
      windowManager: mockWindowManager,
      systemErrorTracker: mockSystemErrorTracker,
      eventStats: mockEventStats,
      hubVersion: '1.0.3',
      log: mockLog,
    };
  });

  it('should start power save blocker', async () => {
    const { startServices } = await import('../service-startup.js');

    const handle = startServices(deps);

    expect(mockPowerSaveBlocker.start).toHaveBeenCalledWith('prevent-app-suspension');
    expect(handle.blockerId).toBe(42);
  });

  it('should start MQTT broker', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockServices.mqtt.start).toHaveBeenCalled();
  });

  it('should start connection monitor', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockServices.driverRegistry.startConnectionMonitor).toHaveBeenCalled();
  });

  it('should install default transformers', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockInstallDefaultTransformers).toHaveBeenCalled();
  });

  it('should install default interceptors', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockInstallDefaultInterceptors).toHaveBeenCalled();
  });

  it('should install default LED hardware', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockInstallDefaultLedHardware).toHaveBeenCalled();
  });

  it('should setup driver event handlers', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockSetupDriverEventHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        systemMonitor: mockServices.systemMonitor,
        driverConnectService: mockDriverConnectService,
      }),
    );
  });

  it('should register IPC handlers', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockRegisterIpcHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        driverRegistry: mockServices.driverRegistry,
        driverConfig: mockServices.driverConfig,
        driverLogPersistence: mockServices.driverLogPersistence,
        ledHardwareManager: mockServices.ledHardwareManager,
        mqtt: mockServices.mqtt,
      }),
    );
  });

  it('should register MQTT subscriptions', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockRegisterMqttSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({
        mqtt: mockServices.mqtt,
        driverRegistry: mockServices.driverRegistry,
        driverConfig: mockServices.driverConfig,
        systemMonitor: mockServices.systemMonitor,
        driverLogPersistence: mockServices.driverLogPersistence,
      }),
    );
  });

  it('should start event reader', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockServices.eventReader.start).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('should start firmware monitoring', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    expect(mockServices.systemMonitor.startFirmwareMonitoring).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('should return handle that can stop power save blocker', async () => {
    const { startServices } = await import('../service-startup.js');

    const handle = startServices(deps);
    handle.stop();

    expect(mockPowerSaveBlocker.stop).toHaveBeenCalledWith(42);
  });

  it('should not stop power save blocker if not started', async () => {
    mockPowerSaveBlocker.isStarted.mockReturnValue(false);

    const { startServices } = await import('../service-startup.js');

    const handle = startServices(deps);
    handle.stop();

    expect(mockPowerSaveBlocker.stop).not.toHaveBeenCalled();
  });

  it('should load transformers after installing defaults', async () => {
    const { startServices } = await import('../service-startup.js');

    startServices(deps);

    // Wait for async operations
    await vi.waitFor(() => {
      expect(mockServices.transformerEngine.loadTransformers).toHaveBeenCalled();
    });
  });

  describe('event processor callback', () => {
    type MockFn = ReturnType<typeof vi.fn>;

    function getEventProcessor() {
      const startMock = mockServices.eventReader.start as MockFn;
      return startMock.mock.calls[0][0];
    }

    it('should forward events to transformer engine', async () => {
      const { startServices } = await import('../service-startup.js');
      startServices(deps);

      getEventProcessor()('game/init', 'pacman');

      expect(mockServices.transformerEngine.handleEvent)
        .toHaveBeenCalledWith('game/init', 'pacman');
    });

    it('should increment event stats', async () => {
      const { startServices } = await import('../service-startup.js');
      startServices(deps);

      getEventProcessor()('game/init', 'pacman');

      expect(mockEventStats.increment).toHaveBeenCalled();
    });

    it('should send event to renderer via IPC', async () => {
      const { startServices } = await import('../service-startup.js');
      startServices(deps);

      getEventProcessor()('game/init', 'pacman');

      expect(mockWindowManager.sendEventToRenderer)
        .toHaveBeenCalledWith(
          IPC.EVENT_RECEIVED, 'game/init', 'pacman',
        );
    });

    it('should pass undefined for empty message', async () => {
      const { startServices } = await import('../service-startup.js');
      startServices(deps);

      getEventProcessor()('game/start', '');

      expect(mockWindowManager.sendEventToRenderer)
        .toHaveBeenCalledWith(
          IPC.EVENT_RECEIVED, 'game/start', undefined,
        );
    });

    it('should emit system:error for interceptor errors', async () => {
      const { eventBus } = await import('../event-bus.js');
      const { startServices } = await import('../service-startup.js');
      startServices(deps);

      getEventProcessor()('rgfx/interceptor/error', 'broke');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          errorType: 'interceptor',
          message: 'broke',
        }),
      );
    });
  });

  describe('event reader error callback', () => {
    it('should emit system:error on reader errors', async () => {
      const { eventBus } = await import('../event-bus.js');
      const { startServices } = await import('../service-startup.js');
      startServices(deps);

      type MockFn = ReturnType<typeof vi.fn>;
      const startMock = mockServices.eventReader.start as MockFn;
      const errorCallback = startMock.mock.calls[0][1];

      errorCallback('Invalid topic: /bad/path');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          errorType: 'interceptor',
          message: 'Invalid topic: /bad/path',
        }),
      );
    });
  });

  describe('firmware monitoring callback', () => {
    it('should send system status on version change', async () => {
      const { startServices } = await import('../service-startup.js');
      startServices(deps);

      type MockFn = ReturnType<typeof vi.fn>;
      const fwMock =
        mockServices.systemMonitor
          .startFirmwareMonitoring as MockFn;
      const firmwareCallback = fwMock.mock.calls[0][0];

      firmwareCallback('1.2.3');

      expect(mockWindowManager.sendSystemStatus)
        .toHaveBeenCalled();
    });
  });
});
