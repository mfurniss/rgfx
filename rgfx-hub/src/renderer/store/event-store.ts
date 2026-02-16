import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MAX_EVENT_TOPICS } from '@/config/constants';
import { createDebouncedStorage } from './debounced-storage';

interface EventTopicData {
  count: number;
  lastValue?: string;
}

interface EventStore {
  topics: Partial<Record<string, EventTopicData>>;
  onEvent: (topic: string, payload?: string) => void;
  reset: () => void;
}

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      topics: {},

      onEvent: (topic: string, payload?: string) => {
        const { topics } = get();
        const existing = topics[topic];
        const currentCount = existing ? existing.count : 0;

        const topicKeys = Object.keys(topics);

        // Evict oldest topic if at limit and this is a new topic
        let baseTopics = topics;

        if (topicKeys.length >= MAX_EVENT_TOPICS && !existing) {
          const [, ...rest] = topicKeys;
          baseTopics = rest.reduce<typeof topics>((acc, key) => {
            acc[key] = topics[key];
            return acc;
          }, {});
        }

        set({
          topics: {
            ...baseTopics,
            [topic]: {
              count: currentCount + 1,
              lastValue: payload,
            },
          },
        });
      },

      reset: () => {
        set({ topics: {} });
      },
    }),
    {
      name: 'rgfx-event-monitor',
      storage: createJSONStorage(() => createDebouncedStorage(500)),
    },
  ),
);
