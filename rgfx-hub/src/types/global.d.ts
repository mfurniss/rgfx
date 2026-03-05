import type { RgfxAPI } from '../ipc/contract';

declare global {
  interface Window {
    rgfx: RgfxAPI;
  }
}
