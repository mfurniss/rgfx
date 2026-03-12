import { build } from 'vite';
import { rmSync } from 'fs';

// Clean previous build
rmSync('dist', { recursive: true, force: true });

// Build main process
await build({ configFile: 'vite.main.config.ts' });

// Build preload script
await build({ configFile: 'vite.preload.config.ts' });

// Build renderer
await build({ configFile: 'src/renderer/vite.renderer.config.ts' });
