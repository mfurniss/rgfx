import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.join(__dirname, 'src/renderer'),
  plugins: [react({})], // <-- pass an empty options object
  build: {
    outDir: path.join(__dirname, 'out/renderer'),
  },
});
