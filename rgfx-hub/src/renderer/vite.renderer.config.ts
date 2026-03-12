import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react({})],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..'),
    },
  },
  build: {
    outDir: 'dist/renderer/main_window',
    emptyOutDir: true,
  },
});
