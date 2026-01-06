/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Logger } from '../service-factory';

// Mock the event bus
const mockEventBus = vi.hoisted(() => ({
  on: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
}));

vi.mock('../event-bus', () => ({
  eventBus: mockEventBus,
}));

// Mock logger - keep reference to mock functions for assertions
const mockLogFns = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};
const mockLog = mockLogFns as never as Logger;

describe('registerGlobalErrorHandlers', () => {
  let uncaughtExceptionHandler: ((err: Error) => void) | undefined;
  let unhandledRejectionHandler: ((reason: unknown) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Capture the handlers when process.on is called
    vi.spyOn(process, 'on').mockImplementation(
      (event: string | symbol, handler: (...args: unknown[]) => void) => {
        if (event === 'uncaughtException') {
          uncaughtExceptionHandler = handler as (err: Error) => void;
        } else if (event === 'unhandledRejection') {
          unhandledRejectionHandler = handler as (reason: unknown) => void;
        }
        return process;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    uncaughtExceptionHandler = undefined;
    unhandledRejectionHandler = undefined;
  });

  it('should register uncaughtException handler', async () => {
    const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');

    registerGlobalErrorHandlers(mockLog);

    expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
  });

  it('should register unhandledRejection handler', async () => {
    const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');

    registerGlobalErrorHandlers(mockLog);

    expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
  });

  describe('uncaughtException handler', () => {
    it('should log socket errors as warnings and emit network SystemError', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      const error = new Error('read ECONNRESET');
      uncaughtExceptionHandler!(error);

      expect(mockLogFns.warn).toHaveBeenCalledWith('Socket error (recovered):', error.message);
      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        errorType: 'network',
        message: expect.stringContaining('ECONNRESET'),
      }));
    });

    it('should handle EPIPE errors as socket errors', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      const error = new Error('write EPIPE');
      uncaughtExceptionHandler!(error);

      expect(mockLogFns.warn).toHaveBeenCalledWith('Socket error (recovered):', error.message);
      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        errorType: 'network',
      }));
    });

    it('should handle ECONNREFUSED errors as socket errors', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      const error = new Error('connect ECONNREFUSED 192.168.1.100:3232');
      uncaughtExceptionHandler!(error);

      expect(mockLogFns.warn).toHaveBeenCalledWith('Socket error (recovered):', error.message);
    });

    it('should handle ETIMEDOUT errors as socket errors', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      const error = new Error('connect ETIMEDOUT');
      uncaughtExceptionHandler!(error);

      expect(mockLogFns.warn).toHaveBeenCalledWith('Socket error (recovered):', error.message);
    });

    it('should log non-socket errors as errors and emit general SystemError', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      const error = new Error('Some other error');
      error.stack = 'Error: Some other error\n    at test.ts:1:1';
      uncaughtExceptionHandler!(error);

      expect(mockLogFns.error).toHaveBeenCalledWith('Uncaught exception:', error);
      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        errorType: 'general',
        message: 'Some other error',
        details: error.stack,
      }));
    });

    it('should include timestamp in emitted SystemError', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      vi.setSystemTime(new Date('2025-01-06T12:00:00Z'));

      const error = new Error('read ECONNRESET');
      uncaughtExceptionHandler!(error);

      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        timestamp: Date.now(),
      }));
    });
  });

  describe('unhandledRejection handler', () => {
    it('should log socket rejection errors as warnings and emit network SystemError', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      const error = new Error('read ECONNRESET');
      unhandledRejectionHandler!(error);

      expect(mockLogFns.warn).toHaveBeenCalledWith('Unhandled rejection (recovered):', error.message);
      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        errorType: 'network',
      }));
    });

    it('should handle non-Error rejections', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      unhandledRejectionHandler!('string rejection');

      expect(mockLogFns.error).toHaveBeenCalledWith('Unhandled rejection:', 'string rejection');
      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        errorType: 'general',
        message: 'string rejection',
      }));
    });

    it('should log non-socket rejections as errors and emit general SystemError', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      const error = new Error('Database connection failed');
      unhandledRejectionHandler!(error);

      expect(mockLogFns.error).toHaveBeenCalledWith('Unhandled rejection:', error);
      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        errorType: 'general',
        message: 'Database connection failed',
      }));
    });

    it('should include stack trace in details for Error rejections', async () => {
      const { registerGlobalErrorHandlers } = await import('../global-error-handler.js');
      registerGlobalErrorHandlers(mockLog);

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:1:1';
      unhandledRejectionHandler!(error);

      expect(mockEventBus.emit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        details: error.stack,
      }));
    });
  });
});
