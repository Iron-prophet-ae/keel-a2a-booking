import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { capabilityIds } from "../capabilities.js";
import { SlotUnavailableError } from "../calendar/mock-adapter.js";
import { config } from "../config.js";
import type { AppBindings } from "../context.js";
import { ApiError } from "../http.js";
import { buildIcs } from "../lib/ics.js";
import { createId } from "../lib/ids.js";
import {
  confirmBookingRequestSchema,
  handshakeRequestSchema,
  intakeRequestSchema,
  proposeSlotsRequestSchema,
  protocolVersion,
} from "../schemas.js";
import type { BookingRecord, MemoryStore } from "../store/memory-store.js";

export const v1 = new Hono<AppBindings>();

v1.post("/handshake", zValidator("json", handshakeRequestSchema), (c) => {
  const body = c.req.valid("json");
  const now = c.get("now");
  const session = c.get("store").putSession({
    id: createId("session"),
    agentId: body.agent_id,
    agentName: body.agent_name ?? body.agent_id,
    org: body.org,
    purpose: body.purpose,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + config.sessionTtlMs).toISOString(),
  });

  return c.json({
    session_id: session.id,
    capabilities: [...capabilityIds],
    expires_at: session.expiresAt,
    protocol_version: protocolVersion,
  });
});

v1.post("/intake", zValidator("json", intakeRequestSchema), (c) => {
  const body = c.req.valid("json");
  requireSession(c.get("store"), body.session_id);
  const intake = c.get("store").putIntake({
    id: createId("intake"),
    sessionId: body.session_id,
    org: body.org,
    contactName: body.contact.name,
    contactEmail: body.contact.email,
    contactAgentId: body.contact.agent_id,
    meetingPurpose: body.meeting.purpose,
    durationMinutes: body.meeting.duration_minutes,
    timezone: body.meeting.timezone,
    notes: body.meeting.notes,
    createdAt: c.get("now").toISOString(),
  });

  return c.json({
    intake_id: intake.id,
    status: "ready_for_slots" as const,
  });
});

v1.post("/slots/propose", zValidator("json", proposeSlotsRequestSchema), async (c) => {
  const body = c.req.valid("json");
  requireSession(c.get("store"), body.session_id);
  const intake = resolveIntake(c.get("store"), body.session_id);
  const slots = await c.get("calendar").propose({
    timezone: intake.timezone,
    durationMinutes: intake.durationMinutes,
    windowStart: new Date(body.window_start),
    windowEnd: new Date(body.window_end),
    limit: body.limit,
  });

  return c.json({
    slots: slots.map((slot) => ({
      slot_id: slot.id,
      start: slot.start,
      end: slot.end,
      timezone: slot.timezone,
    })),
  });
});

v1.post(
  "/bookings/confirm",
  zValidator("json", confirmBookingRequestSchema),
  async (c) => {
    const body = c.req.valid("json");
    requireSession(c.get("store"), body.session_id);
    const intake = resolveIntake(c.get("store"), body.session_id);

    let reserved;
    try {
      reserved = await c.get("calendar").reserve(body.slot_id);
    } catch (error) {
      if (error instanceof SlotUnavailableError) {
        throw new ApiError(409, "slot_unavailable", error.message);
      }
      throw error;
    }

    const booking = c.get("store").putBooking({
      id: createId("booking"),
      sessionId: body.session_id,
      intakeId: intake.id,
      slotId: reserved.id,
      status: "confirmed",
      org: intake.org,
      contactAgentId: intake.contactAgentId,
      meetingPurpose: intake.meetingPurpose,
      timezone: reserved.timezone,
      start: reserved.start,
      end: reserved.end,
      attendeeEmail: body.attendee_email,
      icsUid: `${createId("booking")}@keelops.au`,
      createdAt: c.get("now").toISOString(),
    });

    return c.json(toBookingResponse(booking));
  },
);

v1.get("/bookings/:id", (c) => {
  const booking = c.get("store").getBooking(c.req.param("id"));
  if (!booking) {
    throw new ApiError(404, "booking_not_found", "No booking with that id.");
  }
  return c.json(toBookingResponse(booking));
});

function requireSession(store: MemoryStore, sessionId: string) {
  const session = store.getSession(sessionId);
  if (!session) {
    throw new ApiError(
      401,
      "session_expired",
      "Handshake again. This session is missing or finished.",
    );
  }
  return session;
}

function resolveIntake(store: MemoryStore, sessionId: string) {
  const intake = store.latestIntakeForSession(sessionId);
  if (!intake) {
    throw new ApiError(
      400,
      "intake_required",
      "Send intake for this session before asking for slots or a booking.",
    );
  }
  return intake;
}

function toBookingResponse(booking: BookingRecord) {
  const ics = buildIcs({
    uid: booking.icsUid,
    start: new Date(booking.start),
    end: new Date(booking.end),
    summary: `Keel — ${booking.meetingPurpose}`,
    description: [
      "Keel booking desk confirmation.",
      `Purpose: ${booking.meetingPurpose}`,
      `Organisation: ${booking.org}`,
      "This holds a time. A person at Keel still decides pay, send, sign, and lodge.",
      `Site: ${config.publicSite}`,
    ].join("\n"),
  });

  return {
    booking_id: booking.id,
    status: booking.status,
    slot: {
      slot_id: booking.slotId,
      start: booking.start,
      end: booking.end,
      timezone: booking.timezone,
    },
    ics: {
      uid: ics.uid,
      summary: ics.summary,
      dtstart: ics.dtstart,
      dtend: ics.dtend,
    },
  };
}
