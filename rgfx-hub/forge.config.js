// @ts-check
const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { MakerDMG } = require("@electron-forge/maker-dmg");
const { VitePlugin } = require("@electron-forge/plugin-vite");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

// Azure Artifact Signing — only active in CI when AZURE_ENDPOINT is set
const windowsSignConfig = process.env.AZURE_ENDPOINT ? {
  signToolPath: process.env.SIGNTOOL_PATH,
  signWithParams: `/v /fd SHA256 /tr http://timestamp.acs.microsoft.com /td SHA256 /dlib "${process.env.AZURE_CODE_SIGNING_DLIB}" /dmdf "${process.env.AZURE_METADATA_PATH}"`,
} : undefined;

/** @type {import("@electron-forge/shared-types").ForgeConfig} */
const config = {
  packagerConfig: {
    appBundleId: "com.rgfx.hub",
    executableName: "rgfx-hub",
    asar: true,
    icon: "./assets/icons/icon",
    darwinDarkModeSupport: true,
    // macOS Sequoia requires Local Network permission for UDP sockets
    extendInfo: {
      NSLocalNetworkUsageDescription: "RGFX Hub needs local network access to communicate with LED drivers via UDP and MQTT.",
      NSBonjourServices: ["_mqtt._tcp", "_rgfx._udp"],
    },
    osxSign: {
      optionsForFile: () => ({
        entitlements: "./entitlements.mac.plist",
        entitlementsInherit: "./entitlements.mac.plist",
      }),
    },
    extraResource: [
      "./assets/transformers",
      "./assets/interceptors",
      "./assets/esp32/firmware",
      "./assets/mame",
      "./assets/led-hardware",
      "../LICENSE",
    ],
    ...(windowsSignConfig ? { windowsSign: windowsSignConfig } : {}),
  },

  rebuildConfig: {},

  makers: [
    new MakerSquirrel({
      setupIcon: "./assets/icons/icon.ico",
      ...(windowsSignConfig ? { windowsSign: windowsSignConfig } : {}),
    }, ["win32"]),
    new MakerDMG({
      format: "ULFO",
      icon: "./assets/icons/icon.icns",
      background: undefined,
    }, ["darwin"]),
  ],

  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "src/renderer/vite.renderer.config.ts",
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
