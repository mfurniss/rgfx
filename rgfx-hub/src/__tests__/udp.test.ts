import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Udp } from '../udp';
import dgram from 'node:dgram';

// Mock dgram module
vi.mock('node:dgram');

describe('Udp', () => {
  let udp: Udp;
  let mockSocket: any;

  beforeEach(() => {
    // Create mock socket with proper event handling
    mockSocket = {
      send: vi.fn((_buffer, _offset, _length, _port, _ip, callback) => {
        // Simulate successful send by default
        if (callback) callback(null);
      }),
      close: vi.fn(),
      on: vi.fn(),
    };

    // Mock dgram.createSocket to return our mock socket
    vi.mocked(dgram.createSocket).mockReturnValue(mockSocket);

    udp = new Udp('192.168.1.100', 8888);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create UDP instance with correct IP and port', () => {
      expect(udp.ip).toBe('192.168.1.100');
      expect(dgram.createSocket).toHaveBeenCalledWith('udp4');
    });

    it('should set up error event listener', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('send', () => {
    it('should send UDP message with correct format', () => {
      udp.send({ effect: 'pulse', color: '0xFF0000' });

      const expectedMessage = JSON.stringify({
        effect: 'pulse',
        color: '0xFF0000',
      });

      expect(mockSocket.send).toHaveBeenCalledWith(
        Buffer.from(expectedMessage),
        0,
        Buffer.from(expectedMessage).length,
        8888,
        '192.168.1.100',
        expect.any(Function)
      );
    });

    it('should call success callback on successful send', () => {
      const successCallback = vi.fn();
      udp.setSentCallback(successCallback);

      udp.send({ effect: 'pulse', color: '0x0000FF' });

      expect(successCallback).toHaveBeenCalled();
    });

    it('should call error callback on send failure', () => {
      const errorCallback = vi.fn();
      udp.setErrorCallback(errorCallback);

      // Mock socket.send to simulate error
      const testError = new Error('Network error');
      mockSocket.send.mockImplementation(
        (
          _buffer: Buffer,
          _offset: number,
          _length: number,
          _port: number,
          _ip: string,
          callback?: (err: Error | null) => void
        ) => {
          callback?.(testError);
        }
      );

      udp.send({ effect: 'pulse', color: '0x00FF00' });

      expect(errorCallback).toHaveBeenCalledWith(testError);
    });

    it('should not throw if no callbacks are set', () => {
      expect(() => {
        udp.send({ effect: 'pulse', color: '0xFFFF00' });
      }).not.toThrow();
    });

    it('should send multiple messages sequentially', () => {
      udp.send({ effect: 'pulse', color: '0xFF0000' });
      udp.send({ effect: 'fade', color: '0x00FF00' });
      udp.send({ effect: 'solid', color: '0x0000FF' });

      expect(mockSocket.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('setErrorCallback', () => {
    it('should set error callback that gets called on socket error', () => {
      const errorCallback = vi.fn();
      udp.setErrorCallback(errorCallback);

      // Simulate socket error
      const testError = new Error('Socket error');
      const errorHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'error')?.[1];

      if (errorHandler) {
        errorHandler(testError);
      }

      expect(errorCallback).toHaveBeenCalledWith(testError);
    });
  });

  describe('setSentCallback', () => {
    it('should set sent callback', () => {
      const sentCallback = vi.fn();
      udp.setSentCallback(sentCallback);

      udp.send({ effect: 'pulse', color: '0xFF0000' });

      expect(sentCallback).toHaveBeenCalled();
    });

    it('should allow callback to be changed', () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();

      udp.setSentCallback(firstCallback);
      udp.send({ effect: 'pulse', color: '0xFF0000' });

      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).toHaveBeenCalledTimes(0);

      udp.setSentCallback(secondCallback);
      udp.send({ effect: 'pulse', color: '0x00FF00' });

      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should close the socket', () => {
      udp.stop();

      expect(mockSocket.close).toHaveBeenCalled();
    });
  });

  describe('effect and color combinations', () => {
    it('should handle different effect types', () => {
      const effects = ['pulse', 'fade', 'solid', 'rainbow', 'chase'];

      effects.forEach((effect) => {
        udp.send({ effect, color: '0xFFFFFF' });

        const expectedMessage = JSON.stringify({
          effect,
          color: '0xFFFFFF',
        });

        expect(mockSocket.send).toHaveBeenCalledWith(
          Buffer.from(expectedMessage),
          0,
          Buffer.from(expectedMessage).length,
          8888,
          '192.168.1.100',
          expect.any(Function)
        );
      });
    });

    it('should handle different color formats', () => {
      const colors = ['0xFF0000', '0x00FF00', '0x0000FF', '0xFFFF00', '0xFF00FF'];

      colors.forEach((color) => {
        udp.send({ effect: 'pulse', color });

        const expectedMessage = JSON.stringify({
          effect: 'pulse',
          color,
        });

        expect(mockSocket.send).toHaveBeenCalledWith(
          Buffer.from(expectedMessage),
          0,
          Buffer.from(expectedMessage).length,
          8888,
          '192.168.1.100',
          expect.any(Function)
        );
      });
    });
  });
});
