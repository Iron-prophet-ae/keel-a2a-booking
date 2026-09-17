import type { CalendarAdapter } from "./calendar/adapter.js";
import type { BookingNotifyPayload } from "./notify/confirm-out.js";
import type { MemoryStore } from "./store/memory-store.js";

export type AppBindings = {
  Variables: {
    store: MemoryStore;
    calendar: CalendarAdapter;
    now: Date;
    onConfirmed: (
      payload: BookingNotifyPayload,
      icsText: string,
    ) => Promise<void>;
  };
};
