import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FuseV1Options, flipFuses, FuseVersion } from "@electron/fuses";
import path from "path";
import fs from "fs";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
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
      format: "ULFO", // Compressed DMG
      icon: undefined, // Optional: path to .icns file
      background: undefined, // Optional: path to background image
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
