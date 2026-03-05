import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all heavy dependencies before importing the page
vi.mock('lodash-es', () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => {
    const debounced = (...args: unknown[]) => fn(...args);
    debounced.cancel = vi.fn();
    debounced.flush = vi.fn();
    return debounced;
  },
}));

vi.mock('../../components/layout/page-title', () => ({
  PageTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('../../components/common/super-button', () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('../../components/common/clear-all-effects-button', () => ({
  ClearAllEffectsButton: () => <button>Clear</button>,
}));

vi.mock('../../components/effect-form', () => ({
  EffectForm: () => <div data-testid="effect-form">EffectForm</div>,
}));

vi.mock('../../components/effect-form/preset-selector-modal', () => ({
  PresetSelectorModal: () => null,
}));

// TargetDriversPicker — render checkboxes so we can interact with them
let capturedPickerProps: {
  selectedDrivers: Set<string>;
  selectAll: boolean;
  onSelectAll: () => void;
  onDriverToggle: (id: string) => void;
} | null = null;

vi.mock('../../components/driver/target-drivers-picker', () => ({
  TargetDriversPicker: (props: {
    selectedDrivers: Set<string>;
    selectAll: boolean;
    onSelectAll: () => void;
    onDriverToggle: (id: string) => void;
  }) => {
    capturedPickerProps = props;
    return (
      <div data-testid="target-drivers-picker">
        <span data-testid="selected-count">{props.selectedDrivers.size}</span>
        <button data-testid="select-all-btn" onClick={props.onSelectAll}>
          {props.selectAll ? 'Deselect All' : 'Select All'}
        </button>
      </div>
    );
  },
}));

// Mock schemas
vi.mock('@/schemas', () => {
  const mockSchema = { parse: (v: Record<string, unknown>) => v };
  return {
    effectPropsSchemas: { solid: mockSchema },
    effectRandomizers: { solid: () => ({}) },
    effectPresetConfigs: {},
    effectFieldTypes: {},
    effectFormDefaults: {},
    effectLayoutConfigs: {},
    isEffectName: (name: string) => name === 'solid',
  };
});

vi.mock('../effects-playground', () => ({
  effectDisplayNames: { solid: 'Solid' } as Record<string, string>,
  formEffects: ['solid'],
  TabPanel: (
    { children, value, index }: { children: React.ReactNode; value: number; index: number },
  ) => (value === index ? <div>{children}</div> : null),
  generateBroadcastCode: () => 'mock code',
}));

// Driver store — mutable so we can simulate connection changes
let mockDrivers: { id: string; state: string; mac: string }[] = [];

vi.mock('../../store/driver-store', () => ({
  useDriverStore: vi.fn((selector: (state: { drivers: typeof mockDrivers }) => unknown) =>
    selector({ drivers: mockDrivers }),
  ),
}));

// UI store
const mockSetTestEffectsState = vi.fn();

vi.mock('../../store/ui-store', () => ({
  useUiStore: vi.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      testEffectsSelectedEffect: 'solid',
      testEffectsPropsMap: {},
      setTestEffectsState: mockSetTestEffectsState,
      stripLifespanScale: 1,
    }),
  ),
}));

import TestEffectsPage from '../effects-playground-page.js';

describe('TestEffectsPage driver selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPickerProps = null;
    mockDrivers = [
      { id: 'driver-1', state: 'connected', mac: 'AA:BB:CC:DD:EE:01' },
      { id: 'driver-2', state: 'connected', mac: 'AA:BB:CC:DD:EE:02' },
    ];
  });

  it('should NOT reselect all drivers after user deselects all', () => {
    const { rerender } = render(<TestEffectsPage />);

    // Initial: all drivers selected
    expect(screen.getByTestId('selected-count').textContent).toBe('2');

    // User clicks "Deselect All"
    act(() => {
      capturedPickerProps!.onSelectAll();
    });

    // Selection should be empty
    expect(screen.getByTestId('selected-count').textContent).toBe('0');

    // Simulate a driver store re-render (same drivers, new array reference)
    mockDrivers = [
      { id: 'driver-1', state: 'connected', mac: 'AA:BB:CC:DD:EE:01' },
      { id: 'driver-2', state: 'connected', mac: 'AA:BB:CC:DD:EE:02' },
    ];
    rerender(<TestEffectsPage />);

    // Selection should STILL be empty — not auto-reselected
    expect(screen.getByTestId('selected-count').textContent).toBe('0');
  });

  it('should not change selection when drivers connect or disconnect', () => {
    const { rerender } = render(<TestEffectsPage />);

    // Deselect one driver
    act(() => {
      capturedPickerProps!.onDriverToggle('driver-2');
    });

    expect(screen.getByTestId('selected-count').textContent).toBe('1');

    // New driver connects — selection should not change
    mockDrivers = [
      { id: 'driver-1', state: 'connected', mac: 'AA:BB:CC:DD:EE:01' },
      { id: 'driver-2', state: 'connected', mac: 'AA:BB:CC:DD:EE:02' },
      { id: 'driver-3', state: 'connected', mac: 'AA:BB:CC:DD:EE:03' },
    ];
    rerender(<TestEffectsPage />);

    expect(screen.getByTestId('selected-count').textContent).toBe('1');
    expect(capturedPickerProps!.selectedDrivers.has('driver-1')).toBe(true);
  });
});
