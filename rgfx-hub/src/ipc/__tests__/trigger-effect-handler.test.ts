import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerTriggerEffectHandler } from '../trigger-effect-handler';
import type { UdpClient, EffectPayload } from '@/types/transformer-types';
import type { DriverRegistry } from '@/driver-registry';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

const { mockLog, mockEventBus } = vi.hoisted(() => ({
  mockLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  mockEventBus: {
    emit: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('electron-log/main', () => ({
  default: mockLog,
}));

vi.mock('@/services/event-bus', () => ({
  eventBus: mockEventBus,
}));

describe('registerTriggerEffectHandler', () => {
  let mockUdpClient: MockProxy<UdpClient>;
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let registeredHandler: (event: unknown, payload: EffectPayload) => void;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUdpClient = mock<UdpClient>();
    mockDriverRegistry = mock<DriverRegistry>();

    ipc = await setupIpcHandlerCapture();

    registerTriggerEffectHandler({
      udpClient: mockUdpClient,
      driverRegistry: mockDriverRegistry,
    });

    registeredHandler = ipc.getHandler('effect:trigger') as typeof registeredHandler;
  });

  it('should register handler for effect:trigger channel', () => {
    ipc.assertChannel('effect:trigger');
  });

  it('should pass validated payload with schema defaults to udpClient.broadcast', () => {
    const payload: EffectPayload = {
      effect: 'pulse',
      props: { color: '#FF0000', duration: 500 },
    };

    registeredHandler({}, payload);

    // Handler validates props and applies schema defaults
    expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
    const broadcastPayload = mockUdpClient.broadcast.mock.calls[0][0];
    const props = broadcastPayload.props as Record<string, unknown>;
    expect(broadcastPayload.effect).toBe('pulse');
    expect(props.color).toBe('#FF0000');
    expect(props.duration).toBe(500);
    // Schema defaults are applied
    expect(props.reset).toBe(false);
  });

  it('should propagate broadcast errors', () => {
    const error = new Error('UDP broadcast failed');
    mockUdpClient.broadcast.mockImplementation(() => {
      throw error;
    });

    const payload: EffectPayload = { effect: 'pulse', props: {} };

    expect(() => {
      registeredHandler({}, payload);
    }).toThrow(error);
  });

  describe('validation error handling', () => {
    it('should log effect and props when validation fails', () => {
      const payload: EffectPayload = {
        effect: 'scroll_text',
        props: { gradient: 'not-an-array' }, // Invalid: gradient should be an array
      };

      expect(() => {
        registeredHandler({}, payload);
      }).toThrow(/Invalid effect props/);

      expect(mockLog.error).toHaveBeenCalledWith(
        'Invalid effect props:',
        expect.any(Object),
        expect.objectContaining({
          effect: 'scroll_text',
          props: { gradient: 'not-an-array' },
        }),
      );
    });

    it('should emit SystemError when validation fails', () => {
      const payload: EffectPayload = {
        effect: 'scroll_text',
        props: { gradient: 'not-an-array' },
      };

      expect(() => {
        registeredHandler({}, payload);
      }).toThrow(/Invalid effect props/);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          errorType: 'general',
          message: expect.stringContaining('Invalid effect props for scroll_text'),
          timestamp: expect.any(Number),
          details: expect.any(String),
        }),
      );
    });

    it('should include props in SystemError details', () => {
      const invalidProps = { gradient: { wrongType: true } };
      const payload: EffectPayload = {
        effect: 'text',
        props: invalidProps,
      };

      expect(() => {
        registeredHandler({}, payload);
      }).toThrow(/Invalid effect props/);

      const emitCall = mockEventBus.emit.mock.calls.find(
        (call: unknown[]) => call[0] === 'system:error',
      );
      expect(emitCall).toBeDefined();
      const errorPayload = emitCall![1] as { details: string };
      expect(errorPayload.details).toContain('wrongType');
    });
  });

  describe('strip lifespan scaling', () => {
    // Use 'explode' effect since it has a lifespan property in its schema
    it('should not scale when stripLifespanScale is not provided', () => {
      const payload: EffectPayload = {
        effect: 'explode',
        props: { lifespan: 1000 },
        drivers: ['driver-1'],
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
      const call = mockUdpClient.broadcast.mock.calls[0][0];
      expect((call.props as Record<string, unknown>).lifespan).toBe(1000);
    });

    it('should not scale when stripLifespanScale is 1.0', () => {
      const payload: EffectPayload = {
        effect: 'explode',
        props: { lifespan: 1000 },
        drivers: ['driver-1'],
        stripLifespanScale: 1.0,
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
    });

    it('should not scale when effect has no lifespan', () => {
      const payload: EffectPayload = {
        effect: 'pulse',
        props: { color: '#FF0000', duration: 500 },
        drivers: ['driver-1'],
        stripLifespanScale: 0.5,
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
    });

    it('should not scale when no target drivers specified', () => {
      const payload: EffectPayload = {
        effect: 'explode',
        props: { lifespan: 1000 },
        stripLifespanScale: 0.5,
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
    });

    it('should partition drivers into strip and non-strip groups', () => {
      const stripDriver = {
        id: 'strip-1',
        resolvedHardware: { layout: 'strip' },
      };
      const matrixDriver = {
        id: 'matrix-1',
        resolvedHardware: { layout: 'matrix-tl-h' },
      };
      mockDriverRegistry.getDriver.mockImplementation((id: string) => {
        if (id === 'strip-1') {
          return stripDriver as never;
        }

        if (id === 'matrix-1') {
          return matrixDriver as never;
        }

        return undefined as never;
      });

      const payload: EffectPayload = {
        effect: 'explode',
        props: { lifespan: 1000 },
        drivers: ['strip-1', 'matrix-1'],
        stripLifespanScale: 0.5,
      };

      registeredHandler({}, payload);

      // Two separate broadcasts: one for non-strips, one for strips
      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(2);

      // Non-strip broadcast has original lifespan
      const nonStripCall = mockUdpClient.broadcast.mock.calls[0][0];
      expect((nonStripCall.props as Record<string, unknown>).lifespan).toBe(1000);
      expect(nonStripCall.drivers).toEqual(['matrix-1']);

      // Strip broadcast has scaled lifespan
      const stripCall = mockUdpClient.broadcast.mock.calls[1][0];
      expect((stripCall.props as Record<string, unknown>).lifespan).toBe(500);
      expect(stripCall.drivers).toEqual(['strip-1']);
    });

    it('should broadcast only to strips when all drivers are strips', () => {
      const stripDriver = {
        id: 'strip-1',
        resolvedHardware: { layout: 'strip' },
      };
      mockDriverRegistry.getDriver.mockReturnValue(stripDriver as never);

      const payload: EffectPayload = {
        effect: 'explode',
        props: { lifespan: 1000 },
        drivers: ['strip-1'],
        stripLifespanScale: 0.5,
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
      const call = mockUdpClient.broadcast.mock.calls[0][0];
      expect((call.props as Record<string, unknown>).lifespan).toBe(500);
    });

    it('should broadcast only to non-strips when all are non-strips', () => {
      const matrixDriver = {
        id: 'matrix-1',
        resolvedHardware: { layout: 'matrix-tl-h' },
      };
      mockDriverRegistry.getDriver.mockReturnValue(matrixDriver as never);

      const payload: EffectPayload = {
        effect: 'explode',
        props: { lifespan: 1000 },
        drivers: ['matrix-1'],
        stripLifespanScale: 0.5,
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
      const call = mockUdpClient.broadcast.mock.calls[0][0];
      expect((call.props as Record<string, unknown>).lifespan).toBe(1000);
    });

    it('should treat unknown drivers as non-strips', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined as never);

      const payload: EffectPayload = {
        effect: 'explode',
        props: { lifespan: 1000 },
        drivers: ['unknown-1'],
        stripLifespanScale: 0.5,
      };

      registeredHandler({}, payload);

      expect(mockUdpClient.broadcast).toHaveBeenCalledTimes(1);
      const call = mockUdpClient.broadcast.mock.calls[0][0];
      expect((call.props as Record<string, unknown>).lifespan).toBe(1000);
    });

    it('should round scaled lifespan to nearest integer', () => {
      const stripDriver = {
        id: 'strip-1',
        resolvedHardware: { layout: 'strip' },
      };
      mockDriverRegistry.getDriver.mockReturnValue(stripDriver as never);

      const payload: EffectPayload = {
        effect: 'explode',
        props: { lifespan: 1000 },
        drivers: ['strip-1'],
        stripLifespanScale: 0.33,
      };

      registeredHandler({}, payload);

      const call = mockUdpClient.broadcast.mock.calls[0][0];
      expect((call.props as Record<string, unknown>).lifespan).toBe(330);
    });

    it('should not include stripLifespanScale in broadcast payload', () => {
      const payload: EffectPayload = {
        effect: 'pulse',
        props: { color: '#FF0000', duration: 500 },
        drivers: ['driver-1'],
        stripLifespanScale: 0.5,
      };

      registeredHandler({}, payload);

      const call = mockUdpClient.broadcast.mock.calls[0][0];
      expect(call).not.toHaveProperty('stripLifespanScale');
    });
  });
});
