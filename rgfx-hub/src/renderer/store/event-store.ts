import { create } from 'zustand';
import { devtools, persist, type PersistStorage, type StorageValue } from 'zustand/middleware';

interface EventTopic {
  topic: string;
  count: number;
  lastValue?: string;
}

interface EventStore {
  topics: Map<string, EventTopic>;
  onEventTopic: (topic: string, count: number, lastValue?: string) => void;
  reset: () => void;
}

// Persisted state uses arrays instead of Maps for JSON compatibility
interface PersistedEventStore {
  topics: [string, EventTopic][];
}

// Custom storage that converts Map to/from array for JSON serialization
const eventStorage: PersistStorage<EventStore> = {
  getItem: (name: string): StorageValue<EventStore> | null => {
    const str = localStorage.getItem(name);

    if (!str) {
      return null;
    }

    try {
      const parsed = JSON.parse(str) as StorageValue<PersistedEventStore>;

      return {
        ...parsed,
        state: {
          ...parsed.state,
          topics: new Map<string, EventTopic>(parsed.state.topics),
        } as EventStore,
      };
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<EventStore>): void => {
    const serialized: StorageValue<PersistedEventStore> = {
      ...value,
      state: {
        ...value.state,
        topics: Array.from(value.state.topics.entries()),
      },
    };

    localStorage.setItem(name, JSON.stringify(serialized));
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useEventStore = create<EventStore>()(
  devtools(
    persist(
      (set) => ({
        topics: new Map<string, EventTopic>(),

        onEventTopic: (topic: string, count: number, lastValue?: string) => {
          set((state) => {
            const newTopics = new Map(state.topics);
            newTopics.set(topic, { topic, count, lastValue });
            return { topics: newTopics };
          });
        },

        reset: () => {
          set({ topics: new Map<string, EventTopic>() });
        },
      }),
      {
        name: 'rgfx-event-monitor',
        storage: eventStorage,
      },
    ),
    { name: 'event-store' },
  ),
);
