import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LogDisplay from '../log-display';

vi.mock('use-stick-to-bottom', () => ({
  useStickToBottom: () => ({
    scrollRef: { current: null },
    contentRef: { current: null },
  }),
}));

describe('LogDisplay', () => {
  it('renders empty state when no messages', () => {
    const { getByText } = render(<LogDisplay messages={[]} />);

    expect(getByText('No log messages yet')).toBeDefined();
  });

  it('renders all messages', () => {
    const messages = ['Line 1', 'Line 2', 'Line 3'];
    const { getByText } = render(<LogDisplay messages={messages} />);

    messages.forEach((msg) => {
      expect(getByText(msg)).toBeDefined();
    });
  });

  it('does not show empty state when messages exist', () => {
    const { queryByText } = render(
      <LogDisplay messages={['msg1']} />,
    );

    expect(queryByText('No log messages yet')).toBeNull();
  });

  it('renders messages with monospace font', () => {
    const { getByText } = render(
      <LogDisplay messages={['test message']} />,
    );

    const textEl = getByText('test message');
    const style = window.getComputedStyle(textEl);

    expect(style.fontFamily).toBe('monospace');
  });
});
