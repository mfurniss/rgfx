import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SuperButton from '@/renderer/components/common/super-button';
import { Star as StarIcon } from '@mui/icons-material';

describe('SuperButton', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders button with children text', () => {
    render(<SuperButton>Click Me</SuperButton>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<SuperButton onClick={handleClick}>Click Me</SuperButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with icon when provided', () => {
    render(<SuperButton icon={<StarIcon data-testid="star-icon" />}>With Icon</SuperButton>);
    expect(screen.getByTestId('star-icon')).toBeDefined();
  });

  it('renders tooltip when tooltipTitle is provided', async () => {
    render(<SuperButton tooltipTitle="Help text">Hover Me</SuperButton>);
    const button = screen.getByRole('button');
    fireEvent.mouseOver(button);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeDefined();
    expect(tooltip.textContent).toBe('Help text');
  });

  it('does not render tooltip when tooltipTitle is not provided', () => {
    render(<SuperButton>No Tooltip</SuperButton>);
    fireEvent.mouseOver(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('disables button when disabled prop is true', () => {
    render(<SuperButton disabled>Disabled</SuperButton>);
    expect(screen.getByRole('button').getAttribute('disabled')).not.toBeNull();
  });

  it('disables button when busy is true', () => {
    render(<SuperButton busy>Busy</SuperButton>);
    expect(screen.getByRole('button').getAttribute('disabled')).not.toBeNull();
  });

  it('shows busy spinner when busy is true', () => {
    render(<SuperButton busy>Busy</SuperButton>);
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('shows custom busyIcon when busy and busyIcon provided', () => {
    render(
      <SuperButton busy busyIcon={<StarIcon data-testid="custom-busy" />}>
        Busy
      </SuperButton>,
    );
    expect(screen.getByTestId('custom-busy')).toBeDefined();
  });

  it('replaces icon with busy spinner when busy', () => {
    render(
      <SuperButton busy icon={<StarIcon data-testid="star-icon" />}>
        Busy
      </SuperButton>,
    );
    expect(screen.queryByTestId('star-icon')).toBeNull();
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('passes through button props like variant and color', () => {
    render(
      <SuperButton variant="contained" color="error">
        Styled
      </SuperButton>,
    );
    const button = screen.getByRole('button');
    expect(button.classList.toString()).toContain('MuiButton-contained');
    expect(button.classList.toString()).toContain('MuiButton-colorError');
  });

  it('shows tooltip on disabled button via span wrapper', async () => {
    render(
      <SuperButton disabled tooltipTitle="Disabled tooltip">
        Disabled
      </SuperButton>,
    );
    const button = screen.getByRole('button');
    const span = button.parentElement;
    expect(span?.tagName).toBe('SPAN');
    fireEvent.mouseOver(span!);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toBe('Disabled tooltip');
  });
});
