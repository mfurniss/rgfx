// @ts-check
const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerDMG } = require('@electron-forge/maker-dmg');
const { VitePlugin } = require('@electron-forge/plugin-vite');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

// Azure Trusted Signing — only active in CI when AZURE_ENDPOINT is set.
// Two configs needed because packager and Squirrel have different signing mechanisms:
// - packager runs in-process, so hookFunction works (and avoids flag conflicts)
// - Squirrel serializes config into a SEA binary, so functions can't be used;
//   it calls signtool.exe directly with signWithParams
const azureDlib = process.env.AZURE_CODE_SIGNING_DLIB;
const azureDmdf = process.env.AZURE_METADATA_PATH;

// For @electron/packager — hookFunction gives full control over signtool args
const packagerSignConfig = process.env.AZURE_ENDPOINT
  ? {
      hookFunction: async (/** @type {string} */ fileToSign) => {
        const { execFile } = require('child_process');
        const { promisify } = require('util');
        const execFileAsync = promisify(execFile);
        await execFileAsync(
          /** @type {string} */ (process.env.SIGNTOOL_PATH),
          [
            'sign',
            '/v',
            '/fd',
            'sha256',
            '/tr',
            'http://timestamp.acs.microsoft.com',
            '/td',
            'sha256',
            '/dlib',
            /** @type {string} */ (azureDlib),
            '/dmdf',
            /** @type {string} */ (azureDmdf),
            fileToSign,
          ]
        );
      },
    }
  : undefined;

// For MakerSquirrel — serializable config (no functions) because Squirrel
// creates a SEA binary that calls @electron/windows-sign with these options.
// Uses the system signtool (supports /dlib) instead of Squirrel's bundled vendor copy.
const squirrelSignConfig =
  process.env.AZURE_ENDPOINT && azureDlib && azureDmdf
    ? {
        signToolPath: process.env.SIGNTOOL_PATH,
        signWithParams: `/dlib "${azureDlib}" /dmdf "${azureDmdf}"`,
        hashes: /** @type {any} */ (['sha256']),
        timestampServer: 'http://timestamp.acs.microsoft.com',
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
    ...(packagerSignConfig ? { windowsSign: packagerSignConfig } : {}),
  },

  rebuildConfig: {},

  makers: [
    new MakerSquirrel(
      {
        setupIcon: './assets/icons/icon.ico',
        ...(squirrelSignConfig ? { windowsSign: squirrelSignConfig } : {}),
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
