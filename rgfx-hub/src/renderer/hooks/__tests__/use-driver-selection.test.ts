import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDriverSelection } from '../use-driver-selection';
import { createMockDriver } from '@/__tests__/factories';

describe('useDriverSelection', () => {
  const connectedDrivers = [
    createMockDriver({ id: 'driver-1', state: 'connected' }),
    createMockDriver({ id: 'driver-2', state: 'connected' }),
    createMockDriver({ id: 'driver-3', state: 'connected' }),
  ];

  describe('initial state', () => {
    it('should select all connected drivers by default', () => {
      const { result } = renderHook(() =>
        useDriverSelection({ connectedDrivers }),
      );

      expect(result.current.selectedDrivers.size).toBe(3);
      expect(result.current.selectAll).toBe(true);
    });

    it('should use initialSelectedIds when provided', () => {
      const { result } = renderHook(() =>
        useDriverSelection({
          connectedDrivers,
          initialSelectedIds: ['driver-1'],
        }),
      );

      expect(result.current.selectedDrivers.size).toBe(1);
      expect(result.current.selectedDrivers.has('driver-1')).toBe(true);
      expect(result.current.selectAll).toBe(false);
    });

    it('should handle empty connected drivers', () => {
      const { result } = renderHook(() =>
        useDriverSelection({ connectedDrivers: [] }),
      );

      expect(result.current.selectedDrivers.size).toBe(0);
      expect(result.current.selectAll).toBe(false);
    });
  });

  describe('selectAll derivation', () => {
    it('should be true when all connected drivers are selected', () => {
      const { result } = renderHook(() =>
        useDriverSelection({ connectedDrivers }),
      );

      expect(result.current.selectAll).toBe(true);
    });

    it('should be false when some drivers are deselected', () => {
      const { result } = renderHook(() =>
        useDriverSelection({
          connectedDrivers,
          initialSelectedIds: ['driver-1', 'driver-2'],
        }),
      );

      expect(result.current.selectAll).toBe(false);
    });

    it('should be false with no connected drivers', () => {
      const { result } = renderHook(() =>
        useDriverSelection({ connectedDrivers: [] }),
      );

      expect(result.current.selectAll).toBe(false);
    });
  });

  describe('handleDriverToggle', () => {
    it('should remove a selected driver', () => {
      const { result } = renderHook(() =>
        useDriverSelection({ connectedDrivers }),
      );

      act(() => {
        result.current.handleDriverToggle('driver-2');
      });

      expect(result.current.selectedDrivers.has('driver-2')).toBe(false);
      expect(result.current.selectedDrivers.size).toBe(2);
      expect(result.current.selectAll).toBe(false);
    });

    it('should add an unselected driver', () => {
      const { result } = renderHook(() =>
        useDriverSelection({
          connectedDrivers,
          initialSelectedIds: ['driver-1'],
        }),
      );

      act(() => {
        result.current.handleDriverToggle('driver-2');
      });

      expect(result.current.selectedDrivers.has('driver-2')).toBe(true);
      expect(result.current.selectedDrivers.size).toBe(2);
    });

    it('should derive selectAll after toggling last driver on', () => {
      const { result } = renderHook(() =>
        useDriverSelection({
          connectedDrivers,
          initialSelectedIds: ['driver-1', 'driver-2'],
        }),
      );

      expect(result.current.selectAll).toBe(false);

      act(() => {
        result.current.handleDriverToggle('driver-3');
      });

      expect(result.current.selectAll).toBe(true);
    });
  });

  describe('handleSelectAll', () => {
    it('should deselect all when all are selected', () => {
      const { result } = renderHook(() =>
        useDriverSelection({ connectedDrivers }),
      );

      act(() => {
        result.current.handleSelectAll();
      });

      expect(result.current.selectedDrivers.size).toBe(0);
      expect(result.current.selectAll).toBe(false);
    });

    it('should select all when some are deselected', () => {
      const { result } = renderHook(() =>
        useDriverSelection({
          connectedDrivers,
          initialSelectedIds: ['driver-1'],
        }),
      );

      act(() => {
        result.current.handleSelectAll();
      });

      expect(result.current.selectedDrivers.size).toBe(3);
      expect(result.current.selectAll).toBe(true);
    });

    it('should select all when none are selected', () => {
      const { result } = renderHook(() =>
        useDriverSelection({
          connectedDrivers,
          initialSelectedIds: [],
        }),
      );

      act(() => {
        result.current.handleSelectAll();
      });

      expect(result.current.selectedDrivers.size).toBe(3);
      expect(result.current.selectAll).toBe(true);
    });
  });
});
