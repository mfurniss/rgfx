import { create } from 'zustand';
import type { AppInfo } from '@/types';

interface AppInfoState {
  appInfo: AppInfo | null;
  getAppInfo: () => Promise<void>;
}

export const useAppInfoStore = create<AppInfoState>()((set) => ({
  appInfo: null,

  getAppInfo: async () => {
    const appInfo = await window.rgfx.getAppInfo();
    set({ appInfo });
  },
}));
