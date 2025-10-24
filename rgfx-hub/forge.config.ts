import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FuseV1Options, flipFuses, FuseVersion } from '@electron/fuses';
import path from 'path';
import fs from 'fs';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,

    // Apply fuses after packaging instead of using the FusesPlugin directly
    afterCopy: [
      async (buildPath, electronVersion, platform, arch, callback) => {
        const appPath = path.join(buildPath, 'resources', 'app.asar.unpacked');
        if (fs.existsSync(appPath)) {
          await flipFuses(appPath, {
            version: FuseVersion.V1, // <-- fixed type
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
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
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
          config: 'src/renderer/vite.renderer.config.js',
        },
      ],
    }),
  ],
};

export default config;
