import React from 'react';
import {
  render,
  screen,
  fireEvent,
} from '@testing-library/react';
import { Table, TableBody } from '@mui/material';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventRow } from '../event-row';

const mockSimulateEvent = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as {
    rgfx: { simulateEvent: typeof mockSimulateEvent };
  }).rgfx = {
    simulateEvent: mockSimulateEvent,
  };
});

function renderRow(props: {
  topic: string;
  count: number;
  lastValue?: string;
}) {
  return render(
    <Table>
      <TableBody>
        <EventRow {...props} />
      </TableBody>
    </Table>,
  );
}

describe('EventRow', () => {
  it('renders topic name', () => {
    renderRow({ topic: 'game/score', count: 5, lastValue: '1000' });

    expect(screen.getByText('game/score')).toBeDefined();
  });

  it('renders formatted count', () => {
    renderRow({ topic: 'game/score', count: 1234 });

    expect(screen.getByText('1,234')).toBeDefined();
  });

  it('renders numeric value with hex for 16-bit values', () => {
    renderRow({ topic: 'game/score', count: 1, lastValue: '255' });

    expect(screen.getByText('255 (0x00FF)')).toBeDefined();
  });

  it('renders non-numeric value as-is', () => {
    renderRow({ topic: 'game/state', count: 1, lastValue: 'playing' });

    expect(screen.getByText('playing')).toBeDefined();
  });

  it('renders empty string when lastValue is undefined', () => {
    renderRow({ topic: 'game/event', count: 1 });

    const cells = screen.getAllByRole('cell');
    expect(cells[2].textContent).toBe('');
  });

  it('truncates long string values', () => {
    const longValue = 'a'.repeat(30);
    renderRow({ topic: 'game/state', count: 1, lastValue: longValue });

    // Should show first 25 chars + ellipsis
    const expected = `${'a'.repeat(25)}\u2026`;
    expect(screen.getByText(expected)).toBeDefined();
  });

  it('calls simulateEvent with topic and value on click', () => {
    mockSimulateEvent.mockResolvedValue(undefined);
    renderRow({
      topic: 'game/score',
      count: 1,
      lastValue: '1000',
    });

    const row = screen.getByRole('row');
    fireEvent.click(row);

    expect(mockSimulateEvent).toHaveBeenCalledWith('game/score 1000');
  });

  it('calls simulateEvent with topic only when no value', () => {
    mockSimulateEvent.mockResolvedValue(undefined);
    renderRow({ topic: 'game/event', count: 1 });

    const row = screen.getByRole('row');
    fireEvent.click(row);

    expect(mockSimulateEvent).toHaveBeenCalledWith('game/event');
  });

  it('does not re-render when props are unchanged', () => {
    const renderSpy = vi.fn();
    const SpyRow = React.memo(function SpyRow(props: {
      topic: string;
      count: number;
      lastValue?: string;
    }) {
      renderSpy();
      return <EventRow {...props} />;
    });

    const { rerender } = render(
      <Table>
        <TableBody>
          <SpyRow topic="game/score" count={1} lastValue="100" />
        </TableBody>
      </Table>,
    );

    renderSpy.mockClear();

    rerender(
      <Table>
        <TableBody>
          <SpyRow topic="game/score" count={1} lastValue="100" />
        </TableBody>
      </Table>,
    );

    expect(renderSpy).not.toHaveBeenCalled();
  });
});
