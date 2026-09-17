import { CalendarCredentialsError } from "./errors.js";
import type { CalendarAdapter, ProposeSlotsInput, TimeSlot } from "./adapter.js";

/**
 * Motion adapter. Does not invent tokens.
 * Set CALENDAR_PROVIDER=motion and MOTION_API_KEY when Iron Prophet has a real key.
 */
export class MotionCalendarAdapter implements CalendarAdapter {
  readonly kind = "motion";

  constructor(
    private readonly apiKey = process.env.MOTION_API_KEY ??
      process.env.MOTION_ACCESS_TOKEN,
  ) {
    if (!this.apiKey) {
      throw new CalendarCredentialsError(
        [
          "CALENDAR_PROVIDER=motion but MOTION_API_KEY is unset.",
          "Do not invent a token.",
          "Iron Prophet: Motion → Settings → API → create a key → set MOTION_API_KEY on the host.",
          "Human booking page (do not change keelops.au): https://app.usemotion.com/meet/simon-hand/keel-audit",
        ].join(" "),
      );
    }
  }

  async propose(_input: ProposeSlotsInput): Promise<TimeSlot[]> {
    throw new CalendarCredentialsError(
      "MOTION_API_KEY is present but free/busy mapping is not wired. Confirm Motion availability API routes before calling them. Until then keep CALENDAR_PROVIDER=mock.",
    );
  }

  async getSlot(_slotId: string): Promise<TimeSlot | undefined> {
    return undefined;
  }

  async reserve(_slotId: string): Promise<TimeSlot> {
    throw new CalendarCredentialsError(
      "Motion reserve is not wired. Keep CALENDAR_PROVIDER=mock until OAuth/API mapping exists.",
    );
  }
}
