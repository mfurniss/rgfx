import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all service constructors
const mockMqttBroker = vi.fn();
const mockEventFileReader = vi.fn();
const mockDriverRegistry = vi.fn();
const mockSystemMonitor = vi.fn();
const mockLoadConfig = vi.fn();
const mockDriverConfig = vi.fn().mockImplementation(() => ({
  loadConfig: mockLoadConfig,
}));
const mockDriverLogPersistence = vi.fn();
const mockLEDHardwareManager = vi.fn();
const mockTransformerEngine = vi.fn();
const mockUdpClientImpl = vi.fn().mockImplementation(() => ({
  broadcast: vi.fn(),
}));
const mockMqttClientWrapper = vi.fn();
const mockStateStoreImpl = vi.fn();
const mockLoggerWrapper = vi.fn();
const mockNetworkManager = vi.fn();
const mockCreateUploadConfigToDriver = vi.fn().mockReturnValue(vi.fn());
const mockLoadGif = vi.fn();
const mockGetTransformersDir = vi.fn().mockReturnValue('/mock/transformers');

vi.mock('../../network', () => ({
  MqttBroker: mockMqttBroker,
  NetworkManager: mockNetworkManager,
}));

vi.mock('../../event-file-reader', () => ({
  EventFileReader: mockEventFileReader,
}));

vi.mock('../../driver-registry', () => ({
  DriverRegistry: mockDriverRegistry,
}));

vi.mock('../../system-monitor', () => ({
  SystemMonitor: mockSystemMonitor,
}));

vi.mock('../../driver-config', () => ({
  DriverConfig: mockDriverConfig,
}));

vi.mock('../../driver-log-persistence', () => ({
  DriverLogPersistence: mockDriverLogPersistence,
}));

vi.mock('../../led-hardware-manager', () => ({
  LEDHardwareManager: mockLEDHardwareManager,
}));

vi.mock('../../transformer-engine', () => ({
  TransformerEngine: mockTransformerEngine,
}));

vi.mock('../../transformer/udp-client', () => ({
  UdpClientImpl: mockUdpClientImpl,
}));

vi.mock('../../transformer/mqtt-client-wrapper', () => ({
  MqttClientWrapper: mockMqttClientWrapper,
}));

vi.mock('../../transformer/state-store', () => ({
  StateStoreImpl: mockStateStoreImpl,
}));

vi.mock('../../transformer/logger-wrapper', () => ({
  LoggerWrapper: mockLoggerWrapper,
}));

vi.mock('../../transformer-installer', () => ({
  getTransformersDir: mockGetTransformersDir,
}));

vi.mock('../../gif-loader', () => ({
  loadGif: mockLoadGif,
}));

vi.mock('../../upload-config-to-driver', () => ({
  createUploadConfigToDriver: mockCreateUploadConfigToDriver,
}));

const mockValidateTransformerEffect = vi.fn((payload: unknown) => payload);
vi.mock('../../transformer/validate-effect', () => ({
  validateTransformerEffect: mockValidateTransformerEffect,
}));

describe('createServices', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create all services', async () => {
    const { createServices } = await import('../service-factory.js');

    const services = createServices('/test/config', mockLogger);

    expect(services.driverConfig).toBeDefined();
    expect(services.driverLogPersistence).toBeDefined();
    expect(services.ledHardwareManager).toBeDefined();
    expect(services.mqtt).toBeDefined();
    expect(services.eventReader).toBeDefined();
    expect(services.driverRegistry).toBeDefined();
    expect(services.systemMonitor).toBeDefined();
    expect(services.transformerEngine).toBeDefined();
    expect(services.networkManager).toBeDefined();
    expect(services.udpClient).toBeDefined();
    expect(services.uploadConfigToDriver).toBeDefined();
  });

  it('should initialize persistence services with config path', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/my/config/path', mockLogger);

    expect(mockDriverConfig).toHaveBeenCalledWith('/my/config/path');
    expect(mockDriverLogPersistence).toHaveBeenCalledWith('/my/config/path');
    expect(mockLEDHardwareManager).toHaveBeenCalledWith('/my/config/path');
  });

  it('should create MQTT broker with default port', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', mockLogger);

    expect(mockMqttBroker).toHaveBeenCalledWith(1883);
  });

  it('should create DriverRegistry with driverConfig and ledHardwareManager', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', mockLogger);

    expect(mockDriverRegistry).toHaveBeenCalledWith(
      expect.anything(), // driverConfig instance
      expect.anything(), // ledHardwareManager instance
    );
  });

  it('should call loadConfig before creating DriverRegistry', async () => {
    const callOrder: string[] = [];

    mockLoadConfig.mockImplementation(() => {
      callOrder.push('loadConfig');
    });
    mockDriverRegistry.mockImplementation(() => {
      callOrder.push('DriverRegistry');
    });

    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', mockLogger);

    expect(callOrder).toEqual(['loadConfig', 'DriverRegistry']);
  });

  it('should create uploadConfigToDriver with correct dependencies', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', mockLogger);

    expect(mockCreateUploadConfigToDriver).toHaveBeenCalledWith({
      driverConfig: expect.anything(),
      ledHardwareManager: expect.anything(),
      mqtt: expect.anything(),
    });
  });

  it('should create TransformerEngine with all context services', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', mockLogger);

    expect(mockTransformerEngine).toHaveBeenCalledWith({
      broadcast: expect.any(Function),
      udp: expect.anything(),
      mqtt: expect.anything(),
      http: expect.objectContaining({
        get: expect.any(Function),
        post: expect.any(Function),
        put: expect.any(Function),
        delete: expect.any(Function),
      }),
      state: expect.anything(),
      log: expect.anything(),
      drivers: expect.anything(),
      loadGif: expect.any(Function),
      parseAmbilight: expect.any(Function),
      hslToHex: expect.any(Function),
    });
  });

  it('should create NetworkManager with mqtt broker', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', mockLogger);

    expect(mockNetworkManager).toHaveBeenCalledWith(expect.anything());
  });

  it('should return uploadConfigToDriver function', async () => {
    const mockUploadFn = vi.fn().mockResolvedValue(true);
    mockCreateUploadConfigToDriver.mockReturnValue(mockUploadFn);

    const { createServices } = await import('../service-factory.js');
    const services = createServices('/test/config', mockLogger);

    expect(services.uploadConfigToDriver).toBe(mockUploadFn);
  });
});

describe('HTTP context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()));
  });

  it('should create GET request correctly', async () => {
    const { createServices } = await import('../service-factory.js');

    // Get the http context from the TransformerEngine call
    createServices('/test/config', {} as never);

    const callArgs = mockTransformerEngine.mock.calls[0][0];
    const httpContext = callArgs.http;

    await httpContext.get('https://example.com/api');

    expect(fetch).toHaveBeenCalledWith('https://example.com/api', {
      method: 'GET',
    });
  });

  it('should create POST request with JSON body', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', {} as never);

    const callArgs = mockTransformerEngine.mock.calls[0][0];
    const httpContext = callArgs.http;

    await httpContext.post('https://example.com/api', { foo: 'bar' });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'POST',
        body: '{"foo":"bar"}',
      }),
    );
  });

  it('should create PUT request with JSON body', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', {} as never);

    const callArgs = mockTransformerEngine.mock.calls[0][0];
    const httpContext = callArgs.http;

    await httpContext.put('https://example.com/api', { update: true });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'PUT',
        body: '{"update":true}',
      }),
    );
  });

  it('should create DELETE request correctly', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', {} as never);

    const callArgs = mockTransformerEngine.mock.calls[0][0];
    const httpContext = callArgs.http;

    await httpContext.delete('https://example.com/api/123');

    expect(fetch).toHaveBeenCalledWith('https://example.com/api/123', {
      method: 'DELETE',
    });
  });
});

describe('parseAmbilight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getParseAmbilight() {
    return mockTransformerEngine.mock.calls[0][0].parseAmbilight as (
      payload: string,
      orientation?: 'horizontal' | 'vertical',
    ) => { colors: string[]; orientation: string };
  }

  it('should expand 12-bit hex colors to 24-bit', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    const result = getParseAmbilight()('F00,0F0,00F');
    expect(result.colors).toEqual(['#FF0000', '#00FF00', '#0000FF']);
  });

  it('should handle single color', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    const result = getParseAmbilight()('ABC');
    expect(result.colors).toEqual(['#AABBCC']);
  });

  it('should default orientation to horizontal', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    const result = getParseAmbilight()('F00');
    expect(result.orientation).toBe('horizontal');
  });

  it('should accept vertical orientation', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    const result = getParseAmbilight()('F00', 'vertical');
    expect(result.orientation).toBe('vertical');
  });

  it('should pad missing color channels with 0', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    const result = getParseAmbilight()('A');
    expect(result.colors).toEqual(['#AA0000']);
  });
});

describe('hslToHex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getHslToHex() {
    return mockTransformerEngine.mock.calls[0][0].hslToHex as (
      h: number,
      s: number,
      l: number,
    ) => string;
  }

  it('should convert red (0, 100, 50)', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    expect(getHslToHex()(0, 100, 50)).toBe('#FF0000');
  });

  it('should convert green (120, 100, 50)', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    expect(getHslToHex()(120, 100, 50)).toBe('#00FF00');
  });

  it('should convert blue (240, 100, 50)', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    expect(getHslToHex()(240, 100, 50)).toBe('#0000FF');
  });

  it('should convert black (0, 0, 0)', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    expect(getHslToHex()(0, 0, 0)).toBe('#000000');
  });

  it('should convert white (0, 0, 100)', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    expect(getHslToHex()(0, 0, 100)).toBe('#FFFFFF');
  });

  it('should convert gray (0, 0, 50)', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    expect(getHslToHex()(0, 0, 50)).toBe('#808080');
  });

  it('should handle hue wraparound (360 = 0)', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    expect(getHslToHex()(360, 100, 50)).toBe('#FF0000');
  });

  it('should handle negative hue', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    // -60 degrees wraps to 300 degrees (magenta)
    expect(getHslToHex()(-60, 100, 50)).toBe('#FF00FF');
  });

  it('should cover all 6 hue sectors', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);
    const hslToHex = getHslToHex();

    // Sector 0-60: yellow at 60
    expect(hslToHex(60, 100, 50)).toBe('#FFFF00');
    // Sector 60-120: already tested green at 120
    // Sector 120-180: cyan at 180
    expect(hslToHex(180, 100, 50)).toBe('#00FFFF');
    // Sector 180-240: already tested blue at 240
    // Sector 240-300: magenta at 300
    expect(hslToHex(300, 100, 50)).toBe('#FF00FF');
  });

  it('should clamp saturation and lightness to valid range', async () => {
    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);
    const hslToHex = getHslToHex();

    // s > 100 should clamp to 100
    expect(hslToHex(0, 200, 50)).toBe('#FF0000');
    // l < 0 should clamp to 0
    expect(hslToHex(0, 100, -50)).toBe('#000000');
  });
});

describe('broadcast wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate payload before broadcasting', async () => {
    const mockBroadcast = vi.fn();
    mockUdpClientImpl.mockImplementation(() => ({
      broadcast: mockBroadcast,
    }));

    const { createServices } = await import('../service-factory.js');
    createServices('/test/config', {} as never);

    const callArgs = mockTransformerEngine.mock.calls[0][0];
    const broadcastFn = callArgs.broadcast;

    const payload = { effect: 'pulse', color: '#FF0000' };
    mockValidateTransformerEffect.mockReturnValue(payload);

    broadcastFn(payload);

    expect(mockValidateTransformerEffect).toHaveBeenCalledWith(payload, expect.anything());
    expect(mockBroadcast).toHaveBeenCalledWith(payload);
  });
});

describe('GIF loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTransformersDir.mockReturnValue('/transformers');
  });

  it('should resolve absolute paths directly', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', {} as never);

    const callArgs = mockTransformerEngine.mock.calls[0][0];
    const loadGifFn = callArgs.loadGif;

    loadGifFn('/absolute/path/image.gif');

    expect(mockLoadGif).toHaveBeenCalledWith('/absolute/path/image.gif');
  });

  it('should resolve relative paths from transformers directory', async () => {
    const { createServices } = await import('../service-factory.js');

    createServices('/test/config', {} as never);

    const callArgs = mockTransformerEngine.mock.calls[0][0];
    const loadGifFn = callArgs.loadGif;

    loadGifFn('assets/image.gif');

    expect(mockLoadGif).toHaveBeenCalledWith(
      expect.stringContaining('assets/image.gif'),
    );
  });
});
