import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface EventTopic {
  topic: string;
  count: number;
  lastValue?: string;
}

interface EventStore {
  topics: Map<string, EventTopic>;
  onEventTopic: (topic: string, count: number, lastValue?: string) => void;
}

export const useEventStore = create<EventStore>()(
  devtools(
    (set) => ({
      topics: new Map<string, EventTopic>(),

      onEventTopic: (topic: string, count: number, lastValue?: string) => {
        set((state) => {
          const newTopics = new Map(state.topics);
          newTopics.set(topic, { topic, count, lastValue });
          return { topics: newTopics };
        });
      },
    }),
    { name: "event-store" }
  )
);
