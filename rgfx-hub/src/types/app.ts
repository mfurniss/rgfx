/**
 * Static application information returned by a single IPC call at startup
 */
export interface AppInfo {
  version: string;
  licensePath: string;
  defaultRgfxConfigDir: string;
  defaultMameRomsDir: string;
}
