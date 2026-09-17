import { CalendarCredentialsError } from "./errors.js";
import type { CalendarAdapter, ProposeSlotsInput, TimeSlot } from "./adapter.js";

/**
 * Cal.com adapter. Does not invent tokens.
 * Set CALENDAR_PROVIDER=calcom and CALCOM_API_KEY when a real key exists.
 */
export class CalcomCalendarAdapter implements CalendarAdapter {
  readonly kind = "calcom";

  constructor(private readonly apiKey = process.env.CALCOM_API_KEY) {
    if (!this.apiKey) {
      throw new CalendarCredentialsError(
        [
          "CALENDAR_PROVIDER=calcom but CALCOM_API_KEY is unset.",
          "Do not invent a token.",
          "Iron Prophet: Cal.com → Settings → API keys → create a key → set CALCOM_API_KEY on the host.",
        ].join(" "),
      );
    }
  }

  async propose(_input: ProposeSlotsInput): Promise<TimeSlot[]> {
    throw new CalendarCredentialsError(
      "CALCOM_API_KEY is present but free/busy mapping is not wired. Confirm Cal.com slots API before calling it. Until then keep CALENDAR_PROVIDER=mock.",
    );
  }

  async getSlot(_slotId: string): Promise<TimeSlot | undefined> {
    return undefined;
  }

  async reserve(_slotId: string): Promise<TimeSlot> {
    throw new CalendarCredentialsError(
      "Cal.com reserve is not wired. Keep CALENDAR_PROVIDER=mock until OAuth/API mapping exists.",
    );
  }
}
