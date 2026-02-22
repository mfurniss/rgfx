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
