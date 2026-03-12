/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.rgfx.hub',
  productName: 'RGFX Hub',
  executableName: 'rgfx-hub',

  directories: {
    output: 'out',
  },

  files: ['dist/**/*', 'package.json'],

  extraResources: [
    { from: 'assets/transformers', to: 'transformers' },
    { from: 'assets/interceptors', to: 'interceptors' },
    { from: 'assets/esp32/firmware', to: 'firmware' },
    { from: 'assets/mame', to: 'mame' },
    { from: 'assets/led-hardware', to: 'led-hardware' },
    { from: '../LICENSE', to: 'LICENSE' },
  ],

  asar: true,

  electronFuses: {
    runAsNode: false,
    enableCookieEncryption: true,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
  },

  // --- macOS ---
  mac: {
    target: 'dmg',
    icon: 'assets/icons/icon.icns',
    darkModeSupport: true,
    hardenedRuntime: true,
    entitlements: 'entitlements.mac.plist',
    entitlementsInherit: 'entitlements.mac.plist',
    extendInfo: {
      NSLocalNetworkUsageDescription:
        'RGFX Hub needs local network access to communicate with LED drivers via UDP and MQTT.',
      NSBonjourServices: ['_mqtt._tcp', '_rgfx._udp'],
    },
  },

  dmg: {
    format: 'ULFO',
    icon: 'assets/icons/icon.icns',
  },

  // --- Windows ---
  win: {
    target: 'nsis',
    icon: 'assets/icons/icon.ico',
    azureSignOptions: process.env.AZURE_ENDPOINT
      ? {
          publisherName: process.env.AZURE_PUBLISHER_NAME,
          endpoint: process.env.AZURE_ENDPOINT,
          certificateProfileName: process.env.AZURE_CERT_PROFILE_NAME,
          codeSigningAccountName: process.env.AZURE_CODE_SIGNING_ACCOUNT,
        }
      : undefined,
  },

  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'assets/icons/icon.ico',
    uninstallerIcon: 'assets/icons/icon.ico',
  },
};
