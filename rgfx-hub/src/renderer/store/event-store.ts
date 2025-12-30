import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

        set({
          topics: {
            ...topics,
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
    },
  ),
);
