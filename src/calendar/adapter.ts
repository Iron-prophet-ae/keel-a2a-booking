/**
 * Pluggable calendar. v0 ships MockCalendarAdapter.
 * Next calendar is Motion (not Cal.com/Google unless Motion is blocked).
 * Do not invent MOTION_API_KEY. Fail loud if CALENDAR_PROVIDER=motion
 * without credentials. Do not change keelops.au.
 *
 * Human Motion sink: https://app.usemotion.com/meet/simon-hand/keel-audit
 */
export type TimeSlot = {
  id: string;
  start: string;
  end: string;
  timezone: string;
  durationMinutes: number;
};

export type ProposeSlotsInput = {
  timezone: string;
  durationMinutes: number;
  windowStart?: Date;
  windowEnd?: Date;
  limit?: number;
};

export interface CalendarAdapter {
  readonly kind: string;
  propose(input: ProposeSlotsInput): Promise<TimeSlot[]>;
  getSlot(slotId: string): Promise<TimeSlot | undefined>;
  reserve(slotId: string): Promise<TimeSlot>;
}
