import type { CalendarAdapter } from "./calendar/adapter.js";
import type { MemoryStore } from "./store/memory-store.js";

export type AppBindings = {
  Variables: {
    store: MemoryStore;
    calendar: CalendarAdapter;
    now: Date;
  };
};
