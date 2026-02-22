import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Guard against accidental reintroduction of electron-trpc.
 *
 * electron-trpc was removed because it is incompatible with tRPC v11,
 * and all IPC is now handled by the contract-based system in src/ipc/.
 * These tests ensure the dead infrastructure doesn't creep back in.
 */
describe('tRPC removal guard', () => {
  const packageJson = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'),
  );
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  it.each([
    'electron-trpc',
    '@trpc/client',
    '@trpc/server',
    '@trpc/react-query',
  ])('should not have %s as a dependency', (pkg) => {
    expect(allDeps[pkg]).toBeUndefined();
  });

  it('should not have @tanstack/react-query (only used by tRPC)', () => {
    expect(allDeps['@tanstack/react-query']).toBeUndefined();
  });
});
