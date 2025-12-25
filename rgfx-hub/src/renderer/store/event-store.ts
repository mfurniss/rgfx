import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { EventTopicData } from '../../types';

interface EventStore {
  topics: Record<string, EventTopicData>;
  setTopics: (topics: Record<string, EventTopicData>) => void;
  reset: () => void;
}

export const useEventStore = create<EventStore>()(
  devtools(
    (set) => ({
      topics: {},

      setTopics: (topics: Record<string, EventTopicData>) => {
        set({ topics });
      },

      reset: () => {
        set({ topics: {} });
      },
    }),
    { name: 'event-store' },
  ),
);
