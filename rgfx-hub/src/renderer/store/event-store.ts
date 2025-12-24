import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface EventStore {
  topics: Record<string, number>;
  setTopics: (topics: Record<string, number>) => void;
  reset: () => void;
}

export const useEventStore = create<EventStore>()(
  devtools(
    (set) => ({
      topics: {},

      setTopics: (topics: Record<string, number>) => {
        set({ topics });
      },

      reset: () => {
        set({ topics: {} });
      },
    }),
    { name: 'event-store' },
  ),
);
