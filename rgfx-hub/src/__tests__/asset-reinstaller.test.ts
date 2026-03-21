import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockInstallDefaultInterceptors,
  mockInstallDefaultTransformers,
  mockInstallDefaultLedHardware,
  mockInstallLaunchScript,
} = vi.hoisted(() => ({
  mockInstallDefaultInterceptors: vi.fn().mockResolvedValue(undefined),
  mockInstallDefaultTransformers: vi.fn().mockResolvedValue(undefined),
  mockInstallDefaultLedHardware: vi.fn().mockResolvedValue(undefined),
  mockInstallLaunchScript: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../interceptor-installer', () => ({
  installDefaultInterceptors: mockInstallDefaultInterceptors,
}));

vi.mock('../transformer-installer', () => ({
  installDefaultTransformers: mockInstallDefaultTransformers,
}));

vi.mock('../led-hardware-installer', () => ({
  installDefaultLedHardware: mockInstallDefaultLedHardware,
}));

vi.mock('../launch-script-installer', () => ({
  installLaunchScript: mockInstallLaunchScript,
}));

import { reinstallAllAssets } from '../asset-reinstaller';

describe('reinstallAllAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call all four installers with forceOverwrite=true', async () => {
    await reinstallAllAssets();

    expect(mockInstallDefaultInterceptors).toHaveBeenCalledWith(true);
    expect(mockInstallDefaultTransformers).toHaveBeenCalledWith(true);
    expect(mockInstallDefaultLedHardware).toHaveBeenCalledWith(true);
    expect(mockInstallLaunchScript).toHaveBeenCalledWith(true);
  });

  it('should call installers in order', async () => {
    const callOrder: string[] = [];
    mockInstallDefaultInterceptors.mockImplementation(() => {
      callOrder.push('interceptors');
    });
    mockInstallDefaultTransformers.mockImplementation(() => {
      callOrder.push('transformers');
    });
    mockInstallDefaultLedHardware.mockImplementation(() => {
      callOrder.push('led-hardware');
    });
    mockInstallLaunchScript.mockImplementation(() => {
      callOrder.push('launch-script');
    });

    await reinstallAllAssets();

    expect(callOrder).toEqual(['interceptors', 'transformers', 'led-hardware', 'launch-script']);
  });

  it('should propagate errors from installers', async () => {
    mockInstallDefaultInterceptors.mockRejectedValue(new Error('install failed'));

    await expect(reinstallAllAssets()).rejects.toThrow('install failed');
  });
});
