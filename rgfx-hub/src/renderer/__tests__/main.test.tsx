/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture what createRoot().render() receives
const mockRender = vi.fn();
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: mockRender })),
}));

// Suppress font imports and CSS
vi.mock('@fontsource/poppins/400.css', () => ({}));
vi.mock('@fontsource/poppins/500.css', () => ({}));
vi.mock('@fontsource/poppins/600.css', () => ({}));
vi.mock('@fontsource/poppins/700.css', () => ({}));
vi.mock('../index.css', () => ({}));

// Mock the App component to a simple placeholder
vi.mock('../app', () => ({
  default: () => 'MockApp',
}));

describe('renderer entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a root element
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('renders App directly without any wrapper providers', async () => {
    await import('../main.js');

    expect(mockRender).toHaveBeenCalledTimes(1);

    const rendered = mockRender.mock.calls[0][0];

    // App should be rendered directly, not wrapped in TRPCProvider or
    // any other provider. The rendered element's type should be the
    // mocked App component.
    expect(rendered.type()).toBe('MockApp');
  });
});
