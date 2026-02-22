import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWifiConfigDialog } from '../use-wifi-config-dialog';

const mockSetLastWifiCredentials = vi.fn();

vi.mock('../../store/ui-store', () => ({
  useUiStore: vi.fn((selector) => {
    const state = {
      lastWifiSsid: 'TestNetwork',
      lastWifiPassword: 'testpass123',
      setLastWifiCredentials: mockSetLastWifiCredentials,
    };
    return selector(state);
  }),
}));

describe('useWifiConfigDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with dialog closed', () => {
      const { result } = renderHook(() => useWifiConfigDialog());
      expect(result.current.isOpen).toBe(false);
    });

    it('should initialize with not sending', () => {
      const { result } = renderHook(() => useWifiConfigDialog());
      expect(result.current.isSending).toBe(false);
    });

    it('should initialize with no error', () => {
      const { result } = renderHook(() => useWifiConfigDialog());
      expect(result.current.error).toBeNull();
    });

    it('should provide stored WiFi credentials', () => {
      const { result } = renderHook(() => useWifiConfigDialog());
      expect(result.current.lastWifiSsid).toBe('TestNetwork');
      expect(result.current.lastWifiPassword).toBe('testpass123');
    });
  });

  describe('openDialog', () => {
    it('should set isOpen to true', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.openDialog();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should clear any existing error', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.setError('Previous error');
      });

      expect(result.current.error).toBe('Previous error');

      act(() => {
        result.current.openDialog();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('closeDialog', () => {
    it('should set isOpen to false when not sending', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.openDialog();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeDialog();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should clear error when closing', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.openDialog();
        result.current.setError('Some error');
      });

      act(() => {
        result.current.closeDialog();
      });

      expect(result.current.error).toBeNull();
    });

    it('should NOT close when isSending is true', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.openDialog();
        result.current.setIsSending(true);
      });

      act(() => {
        result.current.closeDialog();
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.setError('Connection failed');
      });

      expect(result.current.error).toBe('Connection failed');
    });

    it('should clear error with null', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.setError('Error');
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setIsSending', () => {
    it('should set sending state to true', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.setIsSending(true);
      });

      expect(result.current.isSending).toBe(true);
    });

    it('should set sending state to false', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.setIsSending(true);
        result.current.setIsSending(false);
      });

      expect(result.current.isSending).toBe(false);
    });
  });

  describe('saveCredentials', () => {
    it('should call store action with credentials', () => {
      const { result } = renderHook(() => useWifiConfigDialog());

      act(() => {
        result.current.saveCredentials('NewNetwork', 'newpass456');
      });

      expect(mockSetLastWifiCredentials).toHaveBeenCalledWith('NewNetwork', 'newpass456');
    });
  });
});
