import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSetTestEffectsState = vi.fn();
const mockTriggerEffect = vi.fn().mockResolvedValue(undefined);

vi.mock('@/renderer/store/driver-store', () => ({
  useDriverStore: vi.fn((selector) =>
    selector({
      drivers: [
        { id: 'driver-1', state: 'connected', disabled: false },
      ],
    }),
  ),
}));

vi.mock('@/renderer/store/system-status-store', () => ({
  useSystemStatusStore: vi.fn((selector) =>
    selector({ systemStatus: { ffmpegAvailable: false } }),
  ),
}));

vi.mock('@/renderer/store/ui-store', () => {
  const state = {
    testEffectsSelectedEffect: 'explode',
    testEffectsPropsMap: {
      explode: '{"speed":50}',
    },
    setTestEffectsState: (...args: unknown[]) =>
      mockSetTestEffectsState(...args),
    stripLifespanScale: 0.6,
  };

  return {
    useUiStore: Object.assign(
      vi.fn((selector) => selector(state)),
      { getState: () => state },
    ),
  };
});

vi.mock('@/schemas', async () => {
  const { z: zod } = await import('zod');
  const schema = zod.object({
    speed: zod.number().default(50),
  });

  return {
    effectPropsSchemas: { explode: schema },
    effectRandomizers: {
      explode: () => ({ speed: 75 }),
    },
    effectPresetConfigs: {},
    effectFieldTypes: {},
    effectFormDefaults: {},
    effectLayoutConfigs: {},
    isEffectName: (name: string) => name === 'explode',
  };
});

vi.mock('../utils/code-generator', () => ({
  generateBroadcastCode: () => 'mock code',
}));

import { useEffectsPlayground } from '../hooks/use-effects-playground';

describe('useEffectsPlayground', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (window as unknown as { rgfx: Record<string, unknown> }).rgfx = {
      triggerEffect: mockTriggerEffect,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return current effect state', () => {
    const { result } = renderHook(() => useEffectsPlayground());

    expect(result.current.selectedEffect).toBe('explode');
    expect(result.current.currentProps).toEqual({ speed: 50 });
  });

  it('should return connected drivers', () => {
    const { result } = renderHook(() => useEffectsPlayground());

    expect(result.current.drivers).toHaveLength(1);
  });

  it('should return ffmpegAvailable from system status', () => {
    const { result } = renderHook(() => useEffectsPlayground());

    expect(result.current.ffmpegAvailable).toBe(false);
  });

  it('should trigger effect with current props', () => {
    const { result } = renderHook(() => useEffectsPlayground());

    act(() => {
      result.current.handleTriggerEffect();
    });

    expect(mockTriggerEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        effect: 'explode',
        props: { speed: 50 },
      }),
    );
  });

  it('should debounce props changes', () => {
    const { result } = renderHook(() => useEffectsPlayground());

    act(() => {
      result.current.formPanelProps.onPropsChange({ speed: 60 });
      result.current.formPanelProps.onPropsChange({ speed: 70 });
      result.current.formPanelProps.onPropsChange({ speed: 80 });
    });

    expect(mockSetTestEffectsState).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockSetTestEffectsState).toHaveBeenCalledTimes(1);
  });

  it('should return memoized broadcast code', () => {
    const { result } = renderHook(() => useEffectsPlayground());

    expect(result.current.broadcastCode).toBe('mock code');
  });

  it('should manage tab index state', () => {
    const { result } = renderHook(() => useEffectsPlayground());

    expect(result.current.tabIndex).toBe(0);

    act(() => {
      result.current.setTabIndex(1);
    });

    expect(result.current.tabIndex).toBe(1);
  });
});
