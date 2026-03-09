/**
 * Static application information returned by a single IPC call at startup
 */
export interface AppInfo {
  version: string;
  platform: string;
  licensePath: string;
  docsPath: string;
  defaultRgfxConfigDir: string;
  defaultMameRomsDir: string;
}
