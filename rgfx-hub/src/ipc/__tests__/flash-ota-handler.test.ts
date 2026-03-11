import { Readable } from 'stream';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerFlashOtaHandler } from '../flash-ota-handler';
import { INVOKE_CHANNELS } from '../contract';
import { eventBus } from '@/services/event-bus';
import type { DriverRegistry } from '@/driver-registry';
import type { MqttBroker } from '@/network';
import { Driver } from '@/types';
import { createMockDriver } from '@/__tests__/factories';
import {
  setupIpcHandlerCapture,
} from '@/__tests__/helpers/ipc-handler.helper';

vi.mocked(eventBus);

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => '/mock/app/path'),
  },
}));

function createMockReadableStream(): Readable {
  const readable = new Readable();
  readable.push(Buffer.from('fake-firmware-data'));
  readable.push(null);

  return readable;
}

vi.mock('fs', async () => {
  const actual =
    await vi.importActual<typeof import('fs')>('fs');

  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      createReadStream: vi.fn(
        () => createMockReadableStream(),
      ),
      statSync: vi.fn(() => ({ size: 1000000 })),
      promises: {
        stat: vi.fn(
          () => Promise.resolve({ size: 1000000 }),
        ),
      },
    },
    existsSync: vi.fn(() => true),
    createReadStream: vi.fn(
      () => createMockReadableStream(),
    ),
    statSync: vi.fn(() => ({ size: 1000000 })),
    promises: {
      stat: vi.fn(
        () => Promise.resolve({ size: 1000000 }),
      ),
    },
  };
});

vi.mock('@/services/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

vi.mock('@/services/global-error-handler', () => ({
  addActiveOtaDriver: vi.fn(),
  removeActiveOtaDriver: vi.fn(),
}));

vi.mock('http', () => {
  const mockServer = {
    listen: vi.fn((_port: number, cb: () => void) => {
      process.nextTick(cb);
    }),
    address: vi.fn(() => ({ port: 54321 })),
    close: vi.fn((cb?: () => void) => {
      if (cb) {
        cb();
      }
    }),
    on: vi.fn(),
  };

  return {
    default: { createServer: vi.fn(() => mockServer) },
    createServer: vi.fn(() => mockServer),
  };
});

vi.mock('@/network/network-utils', () => ({
  getLocalIP: vi.fn(() => '192.168.1.50'),
}));

async function resetFsMocks() {
  const fs = await import('fs');
  (fs.default.existsSync as Mock).mockReturnValue(true);
  (fs.default.createReadStream as Mock).mockImplementation(
    () => createMockReadableStream(),
  );
  (fs.default.statSync as Mock).mockReturnValue(
    { size: 1000000 },
  );
  const fsDef = fs.default as any;
  (fsDef.promises.stat as Mock).mockReturnValue(
    Promise.resolve({ size: 1000000 }),
  );
  (fs.promises.stat as Mock).mockReturnValue(
    Promise.resolve({ size: 1000000 }),
  );
}

describe('registerFlashOtaHandler', () => {
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockMqtt: MockProxy<MqttBroker>;
  let mockDriver: Driver;
  let registeredHandler: (
    event: unknown,
    driverId: string,
  ) => Promise<void>;
  let ipc: Awaited<
    ReturnType<typeof setupIpcHandlerCapture>
  >;
  let mqttSubscriptions: Map<
    string,
    (topic: string, payload: string) => void
  >;

  beforeEach(async () => {
    vi.clearAllMocks();
    mqttSubscriptions = new Map();

    await resetFsMocks();

    mockDriver = createMockDriver();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver
      .mockReturnValue(mockDriver);
    mockDriverRegistry.touchDriver
      .mockReturnValue(mockDriver);

    mockMqtt = mock<MqttBroker>();
    mockMqtt.publish.mockResolvedValue(undefined);
    mockMqtt.subscribe.mockImplementation(
      (
        topic: string,
        cb: (topic: string, payload: string) => void,
      ) => {
        mqttSubscriptions.set(topic, cb);
      },
    );
    mockMqtt.unsubscribe.mockImplementation(
      (topic: string) => {
        mqttSubscriptions.delete(topic);
      },
    );

    ipc = await setupIpcHandlerCapture();

    registerFlashOtaHandler({
      driverRegistry: mockDriverRegistry,
      mqtt: mockMqtt,
    });

    registeredHandler = ipc.getHandler(
      INVOKE_CHANNELS.flashOTA,
    ) as typeof registeredHandler;
  });

  afterEach(() => {
    mqttSubscriptions.clear();
  });

  function simulateOtaResult(
    driverId: string,
    result: { success: boolean; error?: string },
  ) {
    const topic =
      `rgfx/driver/${driverId}/ota/result`;
    const handler = mqttSubscriptions.get(topic);

    if (handler) {
      handler(topic, JSON.stringify(result));
    }
  }

  function simulateOtaProgress(
    driverId: string,
    percent: number,
  ) {
    const topic =
      `rgfx/driver/${driverId}/ota/progress`;
    const handler = mqttSubscriptions.get(topic);

    if (handler) {
      handler(topic, JSON.stringify({ percent }));
    }
  }

  function mockPublishWithResult(
    result: { success: boolean; error?: string },
    progressSteps?: number[],
  ) {
    mockMqtt.publish.mockImplementation(
      (_topic: string, _payload: string) => {
        if (progressSteps) {
          for (const p of progressSteps) {
            simulateOtaProgress('rgfx-driver-0001', p);
          }
        }

        simulateOtaResult('rgfx-driver-0001', result);

        return Promise.resolve();
      },
    );
  }

  describe('handler registration', () => {
    it('registers for driver:flash-ota channel', () => {
      ipc.assertChannel(INVOKE_CHANNELS.flashOTA);
    });
  });

  describe('driver validation', () => {
    it('throws for non-existent driver', async () => {
      mockDriverRegistry.getDriver
        .mockReturnValue(undefined);

      await expect(
        registeredHandler({}, 'unknown-driver'),
      ).rejects.toThrow('Driver not found');
    });

    it('throws for disconnected driver', async () => {
      mockDriver.state = 'disconnected';

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow('Driver is not connected');
    });

    it('throws if driver has no IP', async () => {
      mockDriver.ip = undefined;

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow('Driver IP address not available');
    });

    it('throws if driver has no MAC', async () => {
      mockDriver.mac = undefined as unknown as string;

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow(
        'Driver MAC address not available',
      );
    });
  });

  describe('firmware file validation', () => {
    it('throws if firmware file not found', async () => {
      const fs = await import('fs');
      (fs.default.existsSync as Mock)
        .mockReturnValue(false);

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow('Firmware file not found');
    });
  });

  describe('MQTT OTA flow', () => {
    it('publishes OTA command to correct topic', async () => {
      mockPublishWithResult({ success: true });

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(mockMqtt.publish).toHaveBeenCalledWith(
        `rgfx/driver/${mockDriver.mac}/ota`,
        expect.stringContaining('"url"'),
      );
    });

    it('includes URL, size, and MD5 in command', async () => {
      mockMqtt.publish.mockImplementation(
        (_topic: string, payload: string) => {
          const data = JSON.parse(payload);

          expect(data).toHaveProperty('url');
          expect(data).toHaveProperty('size', 1000000);
          expect(data).toHaveProperty('md5');
          expect(data.url).toMatch(
            /^http:\/\/192\.168\.1\.50:\d+\/firmware\.bin$/,
          );
          expect(data.md5).toMatch(/^[a-f0-9]{32}$/);
          simulateOtaResult(
            'rgfx-driver-0001',
            { success: true },
          );

          return Promise.resolve();
        },
      );

      await registeredHandler({}, 'rgfx-driver-0001');
    });

    it('subscribes to progress and result topics', async () => {
      mockPublishWithResult({ success: true });

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/driver/rgfx-driver-0001/ota/progress',
        expect.any(Function),
      );
      expect(mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/driver/rgfx-driver-0001/ota/result',
        expect.any(Function),
      );
    });

    it('unsubscribes on success', async () => {
      mockPublishWithResult({ success: true });

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(mockMqtt.unsubscribe).toHaveBeenCalledWith(
        'rgfx/driver/rgfx-driver-0001/ota/progress',
      );
      expect(mockMqtt.unsubscribe).toHaveBeenCalledWith(
        'rgfx/driver/rgfx-driver-0001/ota/result',
      );
    });

    it('sets driver state to updating before OTA', async () => {
      let stateWhenFirstEmitCalled: string | undefined;

      vi.mocked(eventBus.emit).mockImplementationOnce(
        (event, data) => {
          if (event === 'driver:updated') {
            stateWhenFirstEmitCalled =
              (data as { driver: Driver }).driver.state;
          }
        },
      );

      mockPublishWithResult({ success: true });

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(stateWhenFirstEmitCalled).toBe('updating');
    });

    it('emits driver:disconnected on success', async () => {
      mockPublishWithResult({ success: true });

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'driver:disconnected',
        {
          driver: expect.objectContaining({
            state: 'disconnected',
            ip: undefined,
          }),
          reason: 'restarting',
        },
      );
    });
  });

  describe('progress events', () => {
    it('forwards progress updates to event bus', async () => {
      mockPublishWithResult({ success: true }, [25, 50]);

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'flash:ota:progress',
        expect.objectContaining({
          driverId: 'rgfx-driver-0001',
          percent: 25,
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        'flash:ota:progress',
        expect.objectContaining({
          driverId: 'rgfx-driver-0001',
          percent: 50,
        }),
      );
    });

    it('touches driver on progress updates', async () => {
      mockPublishWithResult({ success: true }, [50]);

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(
        mockDriverRegistry.touchDriver,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('throws when device reports OTA failure', async () => {
      mockPublishWithResult({
        success: false,
        error: 'MD5 mismatch',
      });

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow('MD5 mismatch');
    });

    it('marks driver disconnected on error', async () => {
      mockPublishWithResult({
        success: false,
        error: 'Write failed',
      });

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow();

      expect(eventBus.emit).toHaveBeenCalledWith(
        'driver:updated',
        {
          driver: expect.objectContaining({
            state: 'disconnected',
          }),
        },
      );
    });

    it('cleans up MQTT subscriptions on error', async () => {
      mockPublishWithResult({
        success: false,
        error: 'Failed',
      });

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow();

      expect(mockMqtt.unsubscribe).toHaveBeenCalledWith(
        'rgfx/driver/rgfx-driver-0001/ota/progress',
      );
      expect(mockMqtt.unsubscribe).toHaveBeenCalledWith(
        'rgfx/driver/rgfx-driver-0001/ota/result',
      );
    });

    it('fails fast if driver does not respond within 15 seconds', async () => {
      vi.useFakeTimers();

      // publish succeeds but driver never responds (old firmware)
      mockMqtt.publish.mockResolvedValue(undefined);

      const promise = registeredHandler(
        {},
        'rgfx-driver-0001',
      ).catch((err: unknown) => err);

      // Advance past the 15-second first contact timeout
      await vi.advanceTimersByTimeAsync(15_000);

      const error = await promise;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'Driver did not respond to OTA command',
      );
      expect((error as Error).message).toContain(
        'USB Serial',
      );

      vi.useRealTimers();
    });

    it('throws when MQTT publish fails', async () => {
      mockMqtt.publish.mockRejectedValue(
        new Error('MQTT connection lost'),
      );

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow('Failed to publish OTA command');
    });
  });

  describe('chip type detection', () => {
    it('throws for unknown chip model', async () => {
      mockDriver.telemetry = undefined;

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow('Driver chip type unknown');
    });

    it('throws for unsupported chip type', async () => {
      mockDriver.telemetry = {
        ...mockDriver.telemetry!,
        chipModel: 'ESP32-C3',
      };

      await expect(
        registeredHandler({}, 'rgfx-driver-0001'),
      ).rejects.toThrow('Unsupported chip type');
    });
  });
});
