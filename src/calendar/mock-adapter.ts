import { createId } from "../lib/ids.js";
import {
  addCalendarDays,
  addMinutes,
  dateInTimeZone,
  weekdayInTimeZone,
  ymdInTimeZone,
} from "../lib/time.js";
import type { CalendarAdapter, ProposeSlotsInput, TimeSlot } from "./adapter.js";

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 16;
const LOOKAHEAD_DAYS = 12;

export type MockCalendarOptions = {
  now?: Date;
};

export class SlotUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

export class MockCalendarAdapter implements CalendarAdapter {
  readonly kind = "mock";
  private readonly now: () => Date;
  private readonly reserved = new Set<string>();
  private readonly slots = new Map<string, TimeSlot>();

  constructor(options: MockCalendarOptions = {}) {
    const frozen = options.now;
    this.now = frozen ? () => new Date(frozen) : () => new Date();
  }

  async propose(input: ProposeSlotsInput): Promise<TimeSlot[]> {
    const limit = input.limit ?? 5;
    const generated = this.generateWindow(input);
    const available = generated.filter((slot) => !this.reserved.has(slot.id));
    return available.slice(0, limit);
  }

  async getSlot(slotId: string): Promise<TimeSlot | undefined> {
    return this.slots.get(slotId);
  }

  async reserve(slotId: string): Promise<TimeSlot> {
    const slot = this.slots.get(slotId);
    if (!slot) {
      throw new SlotUnavailableError("That slot is not on the desk.");
    }
    if (this.reserved.has(slotId)) {
      throw new SlotUnavailableError("That slot was just taken. Propose again.");
    }
    this.reserved.add(slotId);
    return slot;
  }

  private generateWindow(input: ProposeSlotsInput): TimeSlot[] {
    const now = this.now();
    const windowStart = input.windowStart ?? now;
    const windowEnd = input.windowEnd ?? addCalendarDays(now, LOOKAHEAD_DAYS);
    const found: TimeSlot[] = [];

    for (let dayOffset = 0; dayOffset < LOOKAHEAD_DAYS + 2; dayOffset += 1) {
      const cursor = addCalendarDays(windowStart, dayOffset);
      const weekday = weekdayInTimeZone(cursor, input.timezone);
      if (weekday === 0 || weekday === 6) {
        continue;
      }

      const { year, month, day } = ymdInTimeZone(cursor, input.timezone);
      for (
        let hour = BUSINESS_START_HOUR;
        hour < BUSINESS_END_HOUR;
        hour += 1
      ) {
        const start = dateInTimeZone(input.timezone, year, month, day, hour, 0);
        const end = addMinutes(start, input.durationMinutes);
        if (end > dateInTimeZone(input.timezone, year, month, day, BUSINESS_END_HOUR, 0)) {
          continue;
        }
        if (start < now || start < windowStart || end > windowEnd) {
          continue;
        }

        const id = this.slotId(start, input.durationMinutes, input.timezone);
        const slot: TimeSlot = {
          id,
          start: start.toISOString(),
          end: end.toISOString(),
          timezone: input.timezone,
          durationMinutes: input.durationMinutes,
        };
        this.slots.set(id, slot);
        found.push(slot);
      }
    }

    return found;
  }

  private slotId(start: Date, durationMinutes: number, timezone: string): string {
    const stamp = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const zone = timezone.replace(/[^A-Za-z0-9]/g, "_");
    return `slt_${stamp}_${durationMinutes}_${zone}`;
  }
}

export function createDemoSlotId(): string {
  return createId("slot");
}
