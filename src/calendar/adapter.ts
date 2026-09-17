/**
 * Pluggable calendar. v0 ships MockCalendarAdapter.
 * A later adapter can talk to Motion, Cal.com, or Google Calendar
 * without changing the A2A routes.
 *
 * Later human Motion sink (do not wire in v0; do not change keelops.au):
 * https://app.usemotion.com/meet/simon-hand/keel-audit
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
