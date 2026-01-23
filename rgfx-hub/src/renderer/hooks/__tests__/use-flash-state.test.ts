/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlashState } from '../use-flash-state';
import type { DriverFlashStatus } from '@/renderer/store/ui-store';

// Mock console.log to avoid noise in tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('useFlashState', () => {
  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useFlashState());

      expect(result.current.progress).toBe(0);
      expect(result.current.driverFlashStatus.size).toBe(0);
      expect(result.current.logMessages).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.resultModal).toEqual({
        open: false,
        success: false,
        message: '',
        flashMethod: null,
      });
    });

    it('should accept initial driver flash status', () => {
      const initialStatus = new Map<string, DriverFlashStatus>([
        ['driver-1', { status: 'pending', progress: 0 }],
      ]);
      const { result } = renderHook(() => useFlashState(initialStatus));

      expect(result.current.driverFlashStatus.size).toBe(1);
      expect(result.current.driverFlashStatus.get('driver-1')).toEqual({
        status: 'pending',
        progress: 0,
      });
    });
  });

  describe('setProgress', () => {
    it('should update progress value', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.setProgress(50);
      });

      expect(result.current.progress).toBe(50);
    });

    it('should handle 100% progress', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.setProgress(100);
      });

      expect(result.current.progress).toBe(100);
    });
  });

  describe('addLog', () => {
    it('should add timestamped log message', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.addLog('Test message');
      });

      expect(result.current.logMessages).toHaveLength(1);
      expect(result.current.logMessages[0]).toContain('Test message');
      expect(result.current.logMessages[0]).toMatch(/^\[\d{1,2}:\d{2}:\d{2}/);
    });

    it('should append multiple log messages', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.addLog('First message');
        result.current.addLog('Second message');
      });

      expect(result.current.logMessages).toHaveLength(2);
      expect(result.current.logMessages[0]).toContain('First message');
      expect(result.current.logMessages[1]).toContain('Second message');
    });

    it('should log to console', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.addLog('Console test');
      });

      expect(consoleSpy).toHaveBeenCalledWith('>', 'Console test');
    });
  });

  describe('clearLogs', () => {
    it('should clear all log messages', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.addLog('Message 1');
        result.current.addLog('Message 2');
      });

      expect(result.current.logMessages).toHaveLength(2);

      act(() => {
        result.current.clearLogs();
      });

      expect(result.current.logMessages).toHaveLength(0);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('should clear error with null', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.setError('Error');
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('showResult', () => {
    it('should show success result modal with USB method', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.showResult(true, 'Flash successful!', 'usb');
      });

      expect(result.current.resultModal).toEqual({
        open: true,
        success: true,
        message: 'Flash successful!',
        flashMethod: 'usb',
      });
    });

    it('should show failure result modal with OTA method', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.showResult(false, 'Flash failed', 'ota');
      });

      expect(result.current.resultModal).toEqual({
        open: true,
        success: false,
        message: 'Flash failed',
        flashMethod: 'ota',
      });
    });
  });

  describe('closeResult', () => {
    it('should close result modal while preserving other fields', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.showResult(true, 'Success!', 'usb');
      });

      act(() => {
        result.current.closeResult();
      });

      expect(result.current.resultModal).toEqual({
        open: false,
        success: true,
        message: 'Success!',
        flashMethod: 'usb',
      });
    });
  });

  describe('resetForNewFlash', () => {
    it('should reset error, progress, and logs', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.setError('Previous error');
        result.current.setProgress(75);
        result.current.addLog('Previous log');
      });

      act(() => {
        result.current.resetForNewFlash();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.logMessages).toHaveLength(0);
    });

    it('should not reset result modal', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.showResult(true, 'Previous result', 'usb');
        result.current.resetForNewFlash();
      });

      expect(result.current.resultModal.message).toBe('Previous result');
    });
  });

  describe('setDriverFlashStatus', () => {
    it('should update driver flash status', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.setDriverFlashStatus(
          new Map([['driver-1', { status: 'flashing', progress: 50 }]]),
        );
      });

      expect(result.current.driverFlashStatus.get('driver-1')).toEqual({
        status: 'flashing',
        progress: 50,
      });
    });

    it('should support functional updates', () => {
      const { result } = renderHook(() => useFlashState());

      act(() => {
        result.current.setDriverFlashStatus(
          new Map([['driver-1', { status: 'pending', progress: 0 }]]),
        );
      });

      act(() => {
        result.current.setDriverFlashStatus((prev) => {
          const next = new Map(prev);
          next.set('driver-1', { status: 'success', progress: 100 });
          return next;
        });
      });

      expect(result.current.driverFlashStatus.get('driver-1')).toEqual({
        status: 'success',
        progress: 100,
      });
    });
  });
});
