import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FuseV1Options, flipFuses, FuseVersion } from "@electron/fuses";
import path from "path";
import fs from "fs";

const config: ForgeConfig = {
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
    osxSign: {
      optionsForFile: () => ({
        entitlements: "./entitlements.mac.plist",
        hardenedRuntime: true,
      }),
    },
    // Apply fuses after packaging instead of using the FusesPlugin directly
    afterCopy: [
      async (
        buildPath: string,
        electronVersion: string,
        platform: NodeJS.Platform,
        arch: string,
        callback?: () => void,
      ) => {
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
  } as any,

  rebuildConfig: {},

  makers: [
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

export default config;
