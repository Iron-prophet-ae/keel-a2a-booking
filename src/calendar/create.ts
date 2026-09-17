import type { CalendarAdapter } from "./adapter.js";
import { CalcomCalendarAdapter } from "./calcom-adapter.js";
import { CalendarCredentialsError } from "./errors.js";
import { MockCalendarAdapter } from "./mock-adapter.js";
import { MotionCalendarAdapter } from "./motion-adapter.js";

export type CalendarProvider = "mock" | "motion" | "calcom";

export function createCalendarFromEnv(): CalendarAdapter {
  const provider = (process.env.CALENDAR_PROVIDER ?? "mock").toLowerCase();

  if (provider === "mock") {
    return new MockCalendarAdapter();
  }
  if (provider === "motion") {
    return new MotionCalendarAdapter();
  }
  if (provider === "calcom") {
    return new CalcomCalendarAdapter();
  }

  throw new CalendarCredentialsError(
    `Unknown CALENDAR_PROVIDER=${provider}. Use mock | motion | calcom.`,
  );
}
