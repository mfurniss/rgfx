import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PageBanner } from '../page-banner';

describe('PageBanner', () => {
  it('renders children text', () => {
    render(<PageBanner color="info">Test message</PageBanner>);

    expect(screen.getByText('Test message')).toBeDefined();
  });

  it('renders as MUI Alert with filled variant', () => {
    const { container } = render(<PageBanner color="info">Info banner</PageBanner>);

    const alert = container.querySelector('.MuiAlert-filledInfo');
    expect(alert).not.toBeNull();
  });

  it('renders warning severity', () => {
    const { container } = render(<PageBanner color="warning">Warning banner</PageBanner>);

    const alert = container.querySelector('.MuiAlert-filledWarning');
    expect(alert).not.toBeNull();
  });

  it('does not render an icon', () => {
    const { container } = render(<PageBanner color="info">No icon</PageBanner>);

    const icon = container.querySelector('.MuiAlert-icon');
    expect(icon).toBeNull();
  });

  it('renders link children', () => {
    render(
      <PageBanner color="info">
        Visit the <a href="/firmware">Firmware</a> page
      </PageBanner>,
    );

    expect(screen.getByText('Firmware')).toBeDefined();
    expect(screen.getByText(/Visit the/)).toBeDefined();
  });

  it('centers the message text', () => {
    const { container } = render(<PageBanner color="info">Centered</PageBanner>);

    const message = container.querySelector('.MuiAlert-message');
    expect(message).not.toBeNull();
    const styles = window.getComputedStyle(message!);
    expect(styles.textAlign).toBe('center');
  });

  it('renders close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(
      <PageBanner color="info" onClose={onClose}>
        Dismissable
      </PageBanner>,
    );

    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render close button when onClose is omitted', () => {
    const { container } = render(<PageBanner color="info">No close</PageBanner>);

    const iconButton = container.querySelector('.MuiIconButton-root');
    expect(iconButton).toBeNull();
  });
});
