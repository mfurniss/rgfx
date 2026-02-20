/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi } from 'vitest';
import { createRgfxMock, installRgfxMock } from './create-rgfx-mock';
import {
  INVOKE_CHANNELS,
  PUSH_CHANNELS,
  SEND_CHANNELS,
} from '../ipc/contract';

describe('createRgfxMock', () => {
  const expectedCount =
    Object.keys(INVOKE_CHANNELS).length +
    Object.keys(PUSH_CHANNELS).length +
    Object.keys(SEND_CHANNELS).length;

  it('has correct total method count', () => {
    const mock = createRgfxMock();
    expect(Object.keys(mock)).toHaveLength(expectedCount);
  });

  it('has all invoke methods as functions', () => {
    const mock = createRgfxMock();

    for (const name of Object.keys(INVOKE_CHANNELS)) {
      expect(mock, `missing invoke method: ${name}`)
        .toHaveProperty(name);
      expect(typeof mock[name as keyof typeof mock])
        .toBe('function');
    }
  });

  it('has all push methods returning cleanup functions', () => {
    const mock = createRgfxMock();

    for (const name of Object.keys(PUSH_CHANNELS)) {
      expect(mock, `missing push method: ${name}`)
        .toHaveProperty(name);
      const method = mock[name as keyof typeof mock];
      expect(typeof method).toBe('function');
      const cleanup = method(vi.fn());
      expect(typeof cleanup, `${name} should return cleanup fn`)
        .toBe('function');
    }
  });

  it('has all send methods as functions', () => {
    const mock = createRgfxMock();

    for (const name of Object.keys(SEND_CHANNELS)) {
      expect(mock, `missing send method: ${name}`)
        .toHaveProperty(name);
      expect(typeof mock[name as keyof typeof mock])
        .toBe('function');
    }
  });

  it('applies overrides', () => {
    const custom = vi.fn().mockResolvedValue('custom');
    const mock = createRgfxMock({ getAppInfo: custom });
    expect(mock.getAppInfo).toBe(custom);
  });

  it('does not overwrite non-overridden methods', () => {
    const custom = vi.fn();
    const mock = createRgfxMock({ getAppInfo: custom });
    expect(mock.sendDriverCommand).not.toBe(custom);
    expect(typeof mock.sendDriverCommand).toBe('function');
  });
});

describe('installRgfxMock', () => {
  it('assigns mock to window.rgfx', () => {
    const mock = installRgfxMock();
    expect(window.rgfx).toBe(mock);
  });

  it('supports overrides', () => {
    const custom = vi.fn().mockResolvedValue('info');
    installRgfxMock({ getAppInfo: custom });
    expect(window.rgfx.getAppInfo).toBe(custom);
  });
});
