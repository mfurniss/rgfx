/**
 * Page Loading Tests
 *
 * These tests verify that page components can be imported without errors.
 * More comprehensive rendering tests are in individual component tests.
 */
import { describe, it, expect } from 'vitest';

describe('Page Loading Tests', () => {
  it('SystemStatusPage can be imported', async () => {
    const module = await import('../system-status-page.js');
    expect(module.default).toBeDefined();
  });

  it('DriversPage can be imported', async () => {
    const module = await import('../drivers-page.js');
    expect(module.default).toBeDefined();
  });

  it('DriverDetailPage can be imported', async () => {
    const module = await import('../driver-detail-page.js');
    expect(module.default).toBeDefined();
  });

  it('DriverConfigPage can be imported', async () => {
    const module = await import('../driver-config-page.js');
    expect(module.default).toBeDefined();
  });

  it('EventMonitorPage can be imported', async () => {
    const module = await import('../event-monitor-page.js');
    expect(module.default).toBeDefined();
  });

  it('FirmwarePage can be imported', async () => {
    const module = await import('../firmware-page.js');
    expect(module.default).toBeDefined();
  });

  it('EffectsPlaygroundPage can be imported', async () => {
    const module = await import('../effects-playground-page.js');
    expect(module.default).toBeDefined();
  });

  it('SimulatorPage can be imported', async () => {
    const module = await import('../simulator-page.js');
    expect(module.default).toBeDefined();
  });

  it('AboutPage can be imported', async () => {
    const module = await import('../about-page.js');
    expect(module.default).toBeDefined();
  });
});
