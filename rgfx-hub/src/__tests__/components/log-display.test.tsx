import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import LogDisplay from '@/renderer/components/common/log-display';

describe('LogDisplay', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty state when no messages', () => {
    render(<LogDisplay messages={[]} />);

    expect(screen.getByText('No log messages yet')).toBeDefined();
  });

  it('renders log messages', () => {
    const messages = [
      '[10:00:00] Loading firmware...',
      '[10:00:01] Connecting to device...',
      '[10:00:02] Flash complete!',
    ];

    render(<LogDisplay messages={messages} />);

    expect(screen.queryByText('No log messages yet')).toBeNull();

    for (const msg of messages) {
      expect(screen.getByText(msg)).toBeDefined();
    }
  });

  it('renders single message', () => {
    render(<LogDisplay messages={['[10:00:00] Test message']} />);

    expect(screen.getByText('[10:00:00] Test message')).toBeDefined();
  });
});
