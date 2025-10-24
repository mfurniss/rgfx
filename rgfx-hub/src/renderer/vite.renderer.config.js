import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.join(__dirname),   // root is the renderer folder
  plugins: [react({})],
  build: {
    outDir: path.join(__dirname, '../../out/renderer'),
  },
});
