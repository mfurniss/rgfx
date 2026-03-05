import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulatorRow } from '../simulator-row';
import { useUiStore } from '@/renderer/store/ui-store';
import type { SimulatorAutoInterval } from '@/renderer/store/ui-store';
import { SIMULATOR_ROW_COUNT } from '@/config/constants';

const mockSimulateEvent = vi.fn();

const defaultRows = () =>
  Array.from({ length: SIMULATOR_ROW_COUNT }, () => ({
    eventLine: '',
    autoInterval: 'off' as SimulatorAutoInterval,
  }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  (window as unknown as {
    rgfx: { simulateEvent: typeof mockSimulateEvent };
  }).rgfx = {
    simulateEvent: mockSimulateEvent,
  };

  useUiStore.setState({ simulatorRows: defaultRows() });
});

afterEach(() => {
  vi.useRealTimers();
  useUiStore.setState({ simulatorRows: defaultRows() });
});

describe('SimulatorRow', () => {
  describe('text input', () => {
    it('updates the text field immediately on typing', () => {
      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.change(input, { target: { value: 'test/event' } });

      expect((input as HTMLInputElement).value).toBe('test/event');
    });

    it('debounces store updates when typing', () => {
      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.change(input, { target: { value: 'test/event' } });

      // Store should not be updated yet
      const stateBeforeDebounce = useUiStore.getState();
      expect(stateBeforeDebounce.simulatorRows[0].eventLine).toBe('');

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const stateAfterDebounce = useUiStore.getState();
      expect(stateAfterDebounce.simulatorRows[0].eventLine).toBe('test/event');
    });

    it('does not update other rows in the store', () => {
      const rows = defaultRows();
      rows[1] = { eventLine: 'existing/event', autoInterval: '1s' };
      useUiStore.setState({ simulatorRows: rows });

      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.change(input, { target: { value: 'new/event' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const state = useUiStore.getState();
      expect(state.simulatorRows[1].eventLine).toBe('existing/event');
      expect(state.simulatorRows[1].autoInterval).toBe('1s');
    });
  });

  describe('trigger button', () => {
    it('is disabled when input is empty', () => {
      render(<SimulatorRow index={0} />);

      const button = screen.getByRole('button', { name: /trigger/i });
      expect(button).toHaveProperty('disabled', true);
    });

    it('is enabled when input has text', () => {
      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.change(input, { target: { value: 'test/event' } });

      const button = screen.getByRole('button', { name: /trigger/i });
      expect(button).toHaveProperty('disabled', false);
    });

    it('calls simulateEvent when clicked', () => {
      mockSimulateEvent.mockResolvedValue(undefined);
      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.change(input, { target: { value: 'test/event payload' } });

      const button = screen.getByRole('button', { name: /trigger/i });
      fireEvent.click(button);

      expect(mockSimulateEvent).toHaveBeenCalledWith('test/event payload');
    });

    it('flushes debounce on trigger so store is current', () => {
      mockSimulateEvent.mockResolvedValue(undefined);
      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.change(input, { target: { value: 'test/event' } });

      // Click trigger before debounce fires
      const button = screen.getByRole('button', { name: /trigger/i });
      fireEvent.click(button);

      // Store should be flushed immediately
      const state = useUiStore.getState();
      expect(state.simulatorRows[0].eventLine).toBe('test/event');
    });
  });

  describe('Enter key', () => {
    it('triggers simulateEvent on Enter', () => {
      mockSimulateEvent.mockResolvedValue(undefined);
      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.change(input, { target: { value: 'test/event' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSimulateEvent).toHaveBeenCalledWith('test/event');
    });

    it('does not trigger on Shift+Enter', () => {
      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.change(input, { target: { value: 'test/event' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(mockSimulateEvent).not.toHaveBeenCalled();
    });

    it('does not trigger when input is empty', () => {
      render(<SimulatorRow index={0} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSimulateEvent).not.toHaveBeenCalled();
    });
  });

  describe('auto-interval dropdown', () => {
    it('updates the store immediately (no debounce)', () => {
      render(<SimulatorRow index={0} />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);
      const option = screen.getByText('1 second');
      fireEvent.click(option);

      const state = useUiStore.getState();
      expect(state.simulatorRows[0].autoInterval).toBe('1s');
    });
  });

  describe('store sync', () => {
    it('initializes local state from store', () => {
      const rows = defaultRows();
      rows[2] = { eventLine: 'preloaded/event', autoInterval: 'off' };
      useUiStore.setState({ simulatorRows: rows });

      render(<SimulatorRow index={2} />);

      const input = screen.getByPlaceholderText(
        'game/subject/property/qualifier payload',
      );
      expect((input as HTMLInputElement).value).toBe('preloaded/event');
    });
  });
});
