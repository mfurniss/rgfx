/**
 * Auto-generates a complete window.rgfx mock from the IPC contract.
 * Eliminates manual 40-method mock objects in tests.
 */

import { vi, type Mock } from 'vitest';
import {
  INVOKE_CHANNELS,
  PUSH_CHANNELS,
  SEND_CHANNELS,
} from '../ipc/contract';
import type { RgfxAPI } from '../ipc/contract';

export type MockRgfxAPI = {
  [K in keyof RgfxAPI]: Mock;
};

export function createRgfxMock(
  overrides?: Partial<Record<keyof RgfxAPI, Mock>>,
): MockRgfxAPI {
  const mock: Record<string, Mock> = {};

  for (const name of Object.keys(INVOKE_CHANNELS)) {
    mock[name] = vi.fn();
  }

  for (const name of Object.keys(PUSH_CHANNELS)) {
    mock[name] = vi.fn(() => vi.fn());
  }

  for (const name of Object.keys(SEND_CHANNELS)) {
    mock[name] = vi.fn();
  }

  if (overrides) {
    Object.assign(mock, overrides);
  }

  return mock as MockRgfxAPI;
}

/**
 * Assigns the mock to window.rgfx with correct typing.
 * Convenience wrapper to avoid `(window as any).rgfx = ...` in every test.
 */
export function installRgfxMock(
  overrides?: Partial<Record<keyof RgfxAPI, Mock>>,
): MockRgfxAPI {
  const mock = createRgfxMock(overrides);
  (window as Window & { rgfx: unknown }).rgfx = mock;
  return mock;
}
