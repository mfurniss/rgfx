import { create } from 'zustand';

type Severity = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  severity: Severity;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = crypto.randomUUID();
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));

/** Show a notification. Can be called from anywhere (inside or outside React components). */
export const notify = (message: string, severity: Severity): void => {
  useNotificationStore.getState().addNotification({ message, severity });
};
