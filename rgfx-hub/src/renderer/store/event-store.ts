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

// Buffer lives outside Zustand — zero serialization overhead per event
const eventBuffer = new Map<string, { count: number; lastValue?: string }>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_INTERVAL_MS = 250;

function flushEvents() {
  flushTimer = null;

  if (eventBuffer.size === 0) {
    return;
  }

  // Snapshot and clear buffer before merging into state
  const buffered = new Map(eventBuffer);
  eventBuffer.clear();

  useEventStore.setState((state) => {
    const merged = { ...state.topics };

    for (const [topic, data] of buffered) {
      const existing = merged[topic];
      merged[topic] = {
        count: (existing?.count ?? 0) + data.count,
        lastValue: data.lastValue,
      };
    }

    // Evict oldest topics if over limit
    const keys = Object.keys(merged);

    if (keys.length > MAX_EVENT_TOPICS) {
      const keysToKeep = keys.slice(keys.length - MAX_EVENT_TOPICS);

      const trimmed: typeof merged = {};

      for (const key of keysToKeep) {
        trimmed[key] = merged[key];
      }

      return { topics: trimmed };
    }

    return { topics: merged };
  });
}

export const useEventStore = create<EventStore>()(
  persist(
    (set) => ({
      topics: {},

      onEvent: (topic: string, payload?: string) => {
        const existing = eventBuffer.get(topic);
        eventBuffer.set(topic, {
          count: (existing?.count ?? 0) + 1,
          lastValue: payload,
        });

        flushTimer ??= setTimeout(flushEvents, FLUSH_INTERVAL_MS);
      },

      reset: () => {
        eventBuffer.clear();

        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        set({ topics: {} });
      },
    }),
    {
      name: 'rgfx-event-monitor',
      storage: createJSONStorage(() => createDebouncedStorage(500)),
    },
  ),
);
