import { config } from "../config.js";

export type SessionRecord = {
  id: string;
  agentId: string;
  agentName: string;
  org?: string;
  purpose: "schedule_meeting";
  createdAt: string;
  expiresAt: string;
};

export type IntakeRecord = {
  id: string;
  sessionId: string;
  org: string;
  contactName?: string;
  contactEmail?: string;
  contactAgentId: string;
  meetingPurpose: string;
  durationMinutes: 30 | 60 | 90;
  timezone: string;
  notes?: string;
  createdAt: string;
};

export type BookingRecord = {
  id: string;
  sessionId: string;
  intakeId: string;
  slotId: string;
  status: "confirmed";
  org: string;
  contactAgentId: string;
  meetingPurpose: string;
  timezone: string;
  start: string;
  end: string;
  attendeeEmail?: string;
  icsUid: string;
  createdAt: string;
};

export class MemoryStore {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly intakes = new Map<string, IntakeRecord>();
  private readonly bookings = new Map<string, BookingRecord>();
  private readonly bookingOrder: string[] = [];

  putSession(session: SessionRecord): SessionRecord {
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): SessionRecord | undefined {
    const session = this.sessions.get(id);
    if (!session) {
      return undefined;
    }
    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  putIntake(intake: IntakeRecord): IntakeRecord {
    this.intakes.set(intake.id, intake);
    return intake;
  }

  getIntake(id: string): IntakeRecord | undefined {
    return this.intakes.get(id);
  }

  latestIntakeForSession(sessionId: string): IntakeRecord | undefined {
    return [...this.intakes.values()]
      .filter((intake) => intake.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  putBooking(booking: BookingRecord): BookingRecord {
    this.bookings.set(booking.id, booking);
    this.bookingOrder.unshift(booking.id);
    return booking;
  }

  getBooking(id: string): BookingRecord | undefined {
    return this.bookings.get(id);
  }

  recentBookings(limit = config.recentBookingLimit): BookingRecord[] {
    return this.bookingOrder
      .slice(0, limit)
      .map((id) => this.bookings.get(id))
      .filter((booking): booking is BookingRecord => Boolean(booking));
  }
}
