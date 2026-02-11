/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi } from 'vitest';
import { LoggerWrapper } from '../logger-wrapper';

describe('LoggerWrapper', () => {
  function createMockElectronLog() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  }

  it('delegates debug calls', () => {
    const mockLog = createMockElectronLog();
    const wrapper = new LoggerWrapper(mockLog as never);

    wrapper.debug('test message', 'arg1', 42);

    expect(mockLog.debug).toHaveBeenCalledWith(
      'test message',
      'arg1',
      42,
    );
  });

  it('delegates info calls', () => {
    const mockLog = createMockElectronLog();
    const wrapper = new LoggerWrapper(mockLog as never);

    wrapper.info('info message');

    expect(mockLog.info).toHaveBeenCalledWith('info message');
  });

  it('delegates warn calls', () => {
    const mockLog = createMockElectronLog();
    const wrapper = new LoggerWrapper(mockLog as never);

    wrapper.warn('warning', { detail: 'context' });

    expect(mockLog.warn).toHaveBeenCalledWith('warning', {
      detail: 'context',
    });
  });

  it('delegates error calls', () => {
    const mockLog = createMockElectronLog();
    const wrapper = new LoggerWrapper(mockLog as never);

    const err = new Error('something failed');
    wrapper.error('error occurred', err);

    expect(mockLog.error).toHaveBeenCalledWith('error occurred', err);
  });
});
