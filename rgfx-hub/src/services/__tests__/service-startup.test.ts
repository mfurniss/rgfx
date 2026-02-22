import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServiceStartupDeps } from '../service-startup';
import type { AppServices } from '../service-factory';
import type { WindowManager } from '../../window/window-manager';
import type { SystemErrorTracker } from '../system-error-tracker';
import type { EventStats } from '../event-stats';

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
      systemMonitor: { startFirmwareMonitoring: vi.fn() },
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
        driverRegistry: mockServices.driverRegistry,
        driverConfig: mockServices.driverConfig,
        systemMonitor: mockServices.systemMonitor,
        mqtt: mockServices.mqtt,
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
});
