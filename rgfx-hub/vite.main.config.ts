import path from 'path';
import { builtinModules } from 'module';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    // Resolve Node.js entry points (skip "browser" field in package.json)
    // so packages like retimer/aedes use setTimeout instead of Web Workers
    mainFields: ['module', 'main'],
    conditions: ['node', 'import', 'require'],
  },
  define: {
    MAIN_WINDOW_VITE_DEV_SERVER_URL: JSON.stringify(
      process.env.VITE_DEV_SERVER_URL || '',
    ),
    MAIN_WINDOW_VITE_NAME: JSON.stringify('main_window'),
  },
  build: {
    outDir: 'dist/main',
    sourcemap: true,
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'fsevents',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
    minify: false,
    emptyOutDir: false,
  },
});
