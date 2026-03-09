import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LogDisplay from '../log-display';

function getListElement(container: HTMLElement): HTMLUListElement {
  return container.querySelector('.MuiList-root')!;
}

/**
 * Mock the scroll geometry of a DOM element.
 * scrollTop is writable so useLayoutEffect can assign to it.
 * scrollHeight and clientHeight simulate container dimensions.
 */
function mockScrollGeometry(
  el: HTMLElement,
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
) {
  Object.defineProperty(el, 'scrollTop', {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(el, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });
  Object.defineProperty(el, 'clientHeight', {
    value: clientHeight,
    configurable: true,
  });
}

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

  it('auto-scrolls on first render with messages', () => {
    const { container } = render(
      <LogDisplay messages={['msg1']} />,
    );
    const list = getListElement(container);

    // prevScrollHeight starts at 0 → wasAtBottom is true → scrolls
    expect(list.scrollTop).toBe(list.scrollHeight);
  });

  it('auto-scrolls when user was at bottom before new content', () => {
    const { container, rerender } = render(
      <LogDisplay messages={['msg1']} />,
    );
    const list = getListElement(container);

    // Simulate: user is at bottom (scrollTop + clientHeight ≈ scrollHeight)
    // prevScrollHeight was set to 300 by previous useLayoutEffect
    mockScrollGeometry(list, 250, 300, 50);

    // New message arrives — scrollHeight grows to 330
    // useLayoutEffect checks: prevScrollHeight(300) - scrollTop(250) - clientHeight(50) = 0 < 50
    rerender(<LogDisplay messages={['msg1', 'msg2']} />);

    expect(list.scrollTop).toBe(list.scrollHeight);
  });

  it('does not auto-scroll when user has scrolled up', () => {
    const { container, rerender } = render(
      <LogDisplay messages={['msg1']} />,
    );
    const list = getListElement(container);

    // Establish prevScrollHeight by rendering with mocked geometry at bottom
    mockScrollGeometry(list, 250, 300, 50);
    rerender(<LogDisplay messages={['msg1', 'msg2']} />);

    // Now simulate user scrolling up (far from bottom)
    // prevScrollHeight is now 300; scrollTop=0 → 300-0-50=250 > 50
    mockScrollGeometry(list, 0, 300, 50);
    rerender(<LogDisplay messages={['msg1', 'msg2', 'msg3']} />);

    expect(list.scrollTop).toBe(0);
  });

  it('resumes auto-scroll when user scrolls back to bottom', () => {
    const { container, rerender } = render(
      <LogDisplay messages={['msg1']} />,
    );
    const list = getListElement(container);

    // Establish prevScrollHeight
    mockScrollGeometry(list, 250, 300, 50);
    rerender(<LogDisplay messages={['msg1', 'msg2']} />);

    // User scrolled up — auto-scroll should not engage
    mockScrollGeometry(list, 0, 300, 50);
    rerender(<LogDisplay messages={['msg1', 'msg2', 'msg3']} />);

    expect(list.scrollTop).toBe(0);

    // User scrolls back to bottom
    mockScrollGeometry(list, 250, 300, 50);
    rerender(<LogDisplay messages={['msg1', 'msg2', 'msg3', 'msg4']} />);

    expect(list.scrollTop).toBe(list.scrollHeight);
  });
});
