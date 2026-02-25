// @ts-check
const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { MakerDMG } = require("@electron-forge/maker-dmg");
const { VitePlugin } = require("@electron-forge/plugin-vite");
const { FuseV1Options, flipFuses, FuseVersion } = require("@electron/fuses");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

/** @type {import("@electron-forge/shared-types").ForgeConfig} */
const config = {
  hooks: {
    generateAssets: async () => {
      // Skip docs build on Windows (requires bash/mkdocs) and in CI (docs are pre-built)
      if (process.platform === "win32" || process.env.CI) {
        console.log("Skipping docs build (CI or Windows)");
        return;
      }
      console.log("Building documentation...");
      execSync("npm run docs:build", {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
      });
    },
  },
  packagerConfig: {
    appBundleId: "com.rgfx.hub",
    asar: true,
    icon: "./assets/icons/icon",
    darwinDarkModeSupport: true,
    // macOS Sequoia requires Local Network permission for UDP sockets
    extendInfo: {
      NSLocalNetworkUsageDescription: "RGFX Hub needs local network access to communicate with LED drivers via UDP and MQTT.",
      NSBonjourServices: ["_mqtt._tcp", "_rgfx._udp"],
    },
    extraResource: [
      "./assets/transformers",
      "./assets/interceptors",
      "./assets/esp32/firmware",
      "./assets/mame",
      "./assets/led-hardware",
      "../LICENSE",
      "../public-docs/site",
    ],
    // Apply fuses after packaging instead of using the FusesPlugin directly
    afterCopy: [
      async (buildPath, electronVersion, platform, arch, callback) => {
        const appPath = path.join(buildPath, "resources", "app.asar.unpacked");
        if (fs.existsSync(appPath)) {
          await flipFuses(appPath, {
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
          });
        }
        if (callback) callback();
      },
    ],
  },

  rebuildConfig: {},

  makers: [
    new MakerSquirrel({
      setupIcon: "./assets/icons/icon.ico",
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
  ],
};

module.exports = config;
