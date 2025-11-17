import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface EventTopic {
  topic: string;
  count: number;
}

interface EventStore {
  topics: Map<string, number>;
  onEventTopic: (topic: string, count: number) => void;
  getTopicsArray: () => EventTopic[];
}

export const useEventStore = create<EventStore>()(
  devtools(
    (set, get) => ({
      topics: new Map<string, number>(),

      onEventTopic: (topic: string, count: number) => {
        set((state) => {
          const newTopics = new Map(state.topics);
          newTopics.set(topic, count);
          return { topics: newTopics };
        });
      },

      getTopicsArray: () => {
        const topics = get().topics;
        return Array.from(topics.entries()).map(([topic, count]) => ({
          topic,
          count,
        }));
      },
    }),
    { name: "event-store" }
  )
);
