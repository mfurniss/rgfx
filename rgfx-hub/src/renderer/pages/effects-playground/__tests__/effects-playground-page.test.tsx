import React from 'react';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from '@testing-library/react';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
const mockSetTestEffectsState = vi.fn();
const mockTriggerEffect = vi.fn().mockResolvedValue(undefined);

interface MockDriver {
  id: string;
  ip?: string;
  state: 'connected' | 'disconnected';
  telemetry: { chipModel: string };
}

let mockDrivers: MockDriver[] = [
  {
    id: 'driver-1',
    ip: '192.168.1.100',
    state: 'connected',
    telemetry: { chipModel: 'ESP32' },
  },
];

vi.mock('../../../store/driver-store', () => ({
  useDriverStore: vi.fn((selector) =>
    selector({ drivers: mockDrivers }),
  ),
}));

vi.mock('../../../store/ui-store', () => {
  const state = {
    testEffectsSelectedEffect: 'scrollText',
    testEffectsPropsMap: {
      scrollText:
        '{"text":"hello","gradient":["#FF0000"]}',
    },
    setTestEffectsState: (...args: unknown[]) =>
      mockSetTestEffectsState(...args),
    stripLifespanScale: 0.6,
  };

  return {
    useUiStore: Object.assign(
      vi.fn((selector) => selector(state)),
      {
        getState: () => state,
      },
    ),
  };
});

vi.mock('@/schemas', async () => {
  const { z: zod } = await import('zod');
  const schema = zod.object({
    text: zod.string().default('hello'),
    gradient: zod
      .array(zod.string())
      .default(['#FF0000']),
  });

  return {
    effectPropsSchemas: { scrollText: schema },
    effectRandomizers: {
      scrollText: () => ({ text: 'random' }),
    },
    effectPresetConfigs: {},
    effectFieldTypes: {
      scrollText: { gradient: 'gradientArray' },
    },
    effectLayoutConfigs: {},
    isEffectName: (name: string) => name === 'scrollText',
    effectSchemas: {
      scrollText: {
        shape: {
          name: {
            _zod: { def: { values: ['Scroll Text'] } },
          },
        },
      },
    },
  };
});

vi.mock('../effect-helpers', () => ({
  effectDisplayNames: { scrollText: 'Scroll Text' },
  formEffects: ['scrollText'],
}));

vi.mock('../components/tab-panel', () => ({
  TabPanel: ({
    children,
    value,
    index,
  }: {
    children: React.ReactNode;
    value: number;
    index: number;
  }) => (value === index ? <div>{children}</div> : null),
}));

vi.mock('../utils/code-generator', () => ({
  generateBroadcastCode: () => 'mock code',
}));

import { MemoryRouter } from 'react-router-dom';
import TestEffectsPage from '../../effects-playground-page';

function renderPage() {
  return render(
    <MemoryRouter>
      <TestEffectsPage />
    </MemoryRouter>,
  );
}

describe('TestEffectsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockDrivers = [
      {
        id: 'driver-1',
        ip: '192.168.1.100',
        state: 'connected',
        telemetry: { chipModel: 'ESP32' },
      },
    ];
    (
      window as unknown as {
        rgfx: Record<string, unknown>;
      }
    ).rgfx = {
      triggerEffect: mockTriggerEffect,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe('driver selection', () => {
    it('should not auto-modify selection when drivers reconnect', () => {
      // Start with two connected drivers
      mockDrivers = [
        {
          id: 'driver-1',
          ip: '192.168.1.100',
          state: 'connected',
          telemetry: { chipModel: 'ESP32' },
        },
        {
          id: 'driver-2',
          ip: '192.168.1.101',
          state: 'connected',
          telemetry: { chipModel: 'ESP32' },
        },
      ];

      const { rerender } = renderPage();

      // driver-2 goes offline then comes back
      mockDrivers = [
        {
          id: 'driver-1',
          ip: '192.168.1.100',
          state: 'connected',
          telemetry: { chipModel: 'ESP32' },
        },
        {
          id: 'driver-2',
          state: 'disconnected',
          telemetry: { chipModel: 'ESP32' },
        },
      ];

      rerender(
        <MemoryRouter>
          <TestEffectsPage />
        </MemoryRouter>,
      );

      mockDrivers = [
        {
          id: 'driver-1',
          ip: '192.168.1.100',
          state: 'connected',
          telemetry: { chipModel: 'ESP32' },
        },
        {
          id: 'driver-2',
          ip: '192.168.1.101',
          state: 'connected',
          telemetry: { chipModel: 'ESP32' },
        },
      ];

      rerender(
        <MemoryRouter>
          <TestEffectsPage />
        </MemoryRouter>,
      );

      // Selection is user-managed — no auto-sync calls
      expect(mockSetTestEffectsState).not.toHaveBeenCalled();
    });
  });

  describe('debounced form updates', () => {
    it('should debounce store updates on rapid changes', () => {
      renderPage();

      const textInput = screen.getByLabelText('Text');

      fireEvent.change(textInput, {
        target: { value: 'h' },
      });
      fireEvent.change(textInput, {
        target: { value: 'he' },
      });
      fireEvent.change(textInput, {
        target: { value: 'hel' },
      });

      // Store should not be updated yet (debounced)
      expect(
        mockSetTestEffectsState,
      ).not.toHaveBeenCalled();

      // Advance past debounce timer
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Now store should be updated once
      expect(
        mockSetTestEffectsState,
      ).toHaveBeenCalledTimes(1);
    });

    it('should flush debounced changes on trigger', () => {
      renderPage();

      const textInput = screen.getByLabelText('Text');
      fireEvent.change(textInput, {
        target: { value: 'world' },
      });

      // Trigger before debounce settles
      const triggerBtn =
        screen.getByTestId('trigger-effect-btn');

      act(() => {
        fireEvent.click(triggerBtn);
      });

      // Debounce should have flushed to store
      expect(mockSetTestEffectsState).toHaveBeenCalled();

      // Effect should have been triggered
      expect(mockTriggerEffect).toHaveBeenCalled();
    });
  });
});
