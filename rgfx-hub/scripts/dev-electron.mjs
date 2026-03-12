import { createServer, build } from 'vite';
import { spawn } from 'child_process';
import electronPath from 'electron';

// Start Vite dev server for renderer
const server = await createServer({
  configFile: 'src/renderer/vite.renderer.config.ts',
});
await server.listen();

const devServerUrl = server.resolvedUrls.local[0] || server.resolvedUrls.network[0];

// Set env var so main process knows the dev server URL
process.env.VITE_DEV_SERVER_URL = devServerUrl;

// Build main and preload in watch mode
const sharedWatchConfig = {
  build: {
    watch: {},
  },
};

let electronProcess = null;

function startElectron() {
  if (electronProcess) {
    electronProcess.kill();
  }
  electronProcess = spawn(String(electronPath), ['.'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: devServerUrl },
  });
  electronProcess.on('close', (code) => {
    if (code !== null) {
      server.close();
      process.exit(code);
    }
  });
}

let mainReady = false;
let preloadReady = false;

function maybeStartElectron() {
  if (mainReady && preloadReady) {
    startElectron();
  }
}

// Build main process (watch mode)
await build({
  configFile: 'vite.main.config.ts',
  ...sharedWatchConfig,
  plugins: [
    {
      name: 'electron-main-watcher',
      writeBundle() {
        if (!mainReady) {
          mainReady = true;
          maybeStartElectron();
        } else {
          startElectron();
        }
      },
    },
  ],
});

// Build preload (watch mode)
await build({
  configFile: 'vite.preload.config.ts',
  ...sharedWatchConfig,
  plugins: [
    {
      name: 'electron-preload-watcher',
      writeBundle() {
        if (!preloadReady) {
          preloadReady = true;
          maybeStartElectron();
        }
      },
    },
  ],
});
