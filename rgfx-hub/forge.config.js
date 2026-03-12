// @ts-check
const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerDMG } = require('@electron-forge/maker-dmg');
const { VitePlugin } = require('@electron-forge/plugin-vite');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

// Azure Trusted Signing — only active in CI when AZURE_ENDPOINT is set.
// Uses a hookFunction to get full control over the signtool command line,
// because signWithParams is appended after the library's own flags which
// conflict with dlib-based signing (adds /fd without /a or /f, causing
// "No certificates were found" errors).
const windowsSignConfig = process.env.AZURE_ENDPOINT
  ? {
      hookFunction: async (/** @type {string} */ fileToSign) => {
        const { execFile } = require('child_process');
        const { promisify } = require('util');
        const execFileAsync = promisify(execFile);
        const signtoolPath = /** @type {string} */ (process.env.SIGNTOOL_PATH);
        const dlib = /** @type {string} */ (
          process.env.AZURE_CODE_SIGNING_DLIB
        );
        const dmdf = /** @type {string} */ (process.env.AZURE_METADATA_PATH);
        await execFileAsync(signtoolPath, [
          'sign',
          '/v',
          '/fd',
          'sha256',
          '/tr',
          'http://timestamp.acs.microsoft.com',
          '/td',
          'sha256',
          '/dlib',
          dlib,
          '/dmdf',
          dmdf,
          fileToSign,
        ]);
      },
    }
  : undefined;

/** @type {import("@electron-forge/shared-types").ForgeConfig} */
const config = {
  packagerConfig: {
    appBundleId: 'com.rgfx.hub',
    executableName: 'rgfx-hub',
    asar: true,
    icon: './assets/icons/icon',
    darwinDarkModeSupport: true,
    // macOS Sequoia requires Local Network permission for UDP sockets
    extendInfo: {
      NSLocalNetworkUsageDescription:
        'RGFX Hub needs local network access to communicate with LED drivers via UDP and MQTT.',
      NSBonjourServices: ['_mqtt._tcp', '_rgfx._udp'],
    },
    osxSign: {
      optionsForFile: () => ({
        entitlements: './entitlements.mac.plist',
        entitlementsInherit: './entitlements.mac.plist',
      }),
    },
    extraResource: [
      './assets/transformers',
      './assets/interceptors',
      './assets/esp32/firmware',
      './assets/mame',
      './assets/led-hardware',
      '../LICENSE',
    ],
    ...(windowsSignConfig ? { windowsSign: windowsSignConfig } : {}),
  },

  rebuildConfig: {},

  makers: [
    new MakerSquirrel(
      {
        setupIcon: './assets/icons/icon.ico',
        ...(windowsSignConfig ? { windowsSign: windowsSignConfig } : {}),
      },
      ['win32']
    ),
    new MakerDMG(
      {
        format: 'ULFO',
        icon: './assets/icons/icon.icns',
        background: undefined,
      },
      ['darwin']
    ),
  ],

  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'src/renderer/vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

module.exports = config;
