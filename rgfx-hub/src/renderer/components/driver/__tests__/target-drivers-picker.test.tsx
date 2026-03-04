import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TargetDriversPicker } from '../target-drivers-picker';
import { createMockDriver } from '@/__tests__/factories';

const createMockDrivers = () => {
  const disconnected = createMockDriver({ id: 'driver-3', state: 'disconnected' });
  disconnected.ip = undefined;
  return [
    createMockDriver({ id: 'driver-1', ip: '192.168.1.10', state: 'connected' }),
    createMockDriver({ id: 'driver-2', ip: '192.168.1.11', state: 'connected' }),
    disconnected,
  ];
};

describe('TargetDriversPicker', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render button with driver count', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /Target Drivers:/ })).toBeDefined();
      expect(screen.getByText(/Target Drivers:/)).toBeDefined();
    });

    it('should show "All" when all drivers are selected', () => {
      const drivers = createMockDrivers().filter((d) => d.state === 'connected');
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1', 'driver-2'])}
          selectAll={true}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      expect(screen.getByText(/Target Drivers: All/)).toBeDefined();
    });

    it('should show count when some drivers are selected', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      expect(screen.getByText(/1 of 3/)).toBeDefined();
    });

    it('should show warning when no drivers available', () => {
      render(
        <TargetDriversPicker
          drivers={[]}
          selectedDrivers={new Set()}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      expect(screen.getByText('No drivers available')).toBeDefined();
    });
  });

  describe('disabled state', () => {
    it('should disable button when disabled prop is true', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
          disabled={true}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('should enable button when disabled prop is false', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
          disabled={false}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });

    it('should enable button by default when disabled prop is not provided', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });

    it('should not open popover when button is disabled', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
          disabled={true}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Popover content should not be visible
      expect(screen.queryByText('All Available Drivers')).toBeNull();
    });
  });

  describe('popover interaction', () => {
    it('should open popover when button is clicked', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText(/All Available Drivers/)).toBeDefined();
    });

    it('should show all drivers in popover', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set()}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('driver-1')).toBeDefined();
      expect(screen.getByText('driver-2')).toBeDefined();
      expect(screen.getByText('driver-3')).toBeDefined();
    });

    it('should show IP addresses for connected drivers', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set()}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('(192.168.1.10)')).toBeDefined();
      expect(screen.getByText('(192.168.1.11)')).toBeDefined();
    });

    it('should show "disconnected" for offline drivers', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set()}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('(disconnected)')).toBeDefined();
    });
  });

  describe('callbacks', () => {
    it('should call onSelectAll when "All Available Drivers" is clicked', () => {
      const drivers = createMockDrivers();
      const onSelectAll = vi.fn();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set()}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={onSelectAll}
        />,
      );

      fireEvent.click(screen.getByRole('button'));
      const allCheckbox = screen.getByLabelText(/All Available Drivers/);
      fireEvent.click(allCheckbox);

      expect(onSelectAll).toHaveBeenCalledTimes(1);
    });

    it('should call onDriverToggle when individual driver is clicked', () => {
      const drivers = createMockDrivers();
      const onDriverToggle = vi.fn();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set()}
          selectAll={false}
          onDriverToggle={onDriverToggle}
          onSelectAll={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button'));
      const checkbox = screen.getByLabelText(/driver-1/);
      fireEvent.click(checkbox);

      expect(onDriverToggle).toHaveBeenCalledWith('driver-1');
    });

    it('should not call onDriverToggle for disconnected drivers', () => {
      const drivers = createMockDrivers();
      const onDriverToggle = vi.fn();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set()}
          selectAll={false}
          onDriverToggle={onDriverToggle}
          onSelectAll={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button'));

      // driver-3 is disconnected, its checkbox should be disabled
      const checkboxes = screen.getAllByRole('checkbox');
      // Find the checkbox for driver-3 (it's the last one)
      const driver3Checkbox = checkboxes[checkboxes.length - 1];
      expect(driver3Checkbox).toHaveProperty('disabled', true);
    });
  });

  describe('checkbox states', () => {
    it('should show checked state for selected drivers', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button'));
      const checkbox = screen.getByLabelText(/driver-1/);

      expect(checkbox).toHaveProperty('checked', true);
    });

    it('should show unchecked state for unselected drivers', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
          selectAll={false}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button'));
      const checkbox = screen.getByLabelText(/driver-2/);

      expect(checkbox).toHaveProperty('checked', false);
    });

    it('should show checked state for "All Available" when selectAll is true', () => {
      const drivers = createMockDrivers();
      render(
        <TargetDriversPicker
          drivers={drivers}
          selectedDrivers={new Set(['driver-1', 'driver-2'])}
          selectAll={true}
          onDriverToggle={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button'));
      const allCheckbox = screen.getByLabelText(/All Available Drivers/);

      expect(allCheckbox).toHaveProperty('checked', true);
    });
  });
});
