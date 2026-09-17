import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { capabilities } from "../capabilities.js";
import { SlotUnavailableError } from "../calendar/mock-adapter.js";
import { config } from "../config.js";
import type { AppBindings } from "../context.js";
import { ApiError } from "../http.js";
import { buildIcs } from "../lib/ics.js";
import { createId } from "../lib/ids.js";
import {
  bookingStatusResponseSchema,
  confirmBookingRequestSchema,
  handshakeRequestSchema,
  intakeRequestSchema,
  proposeSlotsRequestSchema,
} from "../schemas.js";
import type { BookingRecord, MemoryStore } from "../store/memory-store.js";

export const v1 = new Hono<AppBindings>();

v1.post("/handshake", zValidator("json", handshakeRequestSchema), (c) => {
  const body = c.req.valid("json");
  const now = c.get("now");
  const session = c.get("store").putSession({
    id: createId("session"),
    agentId: body.agent.id,
    agentName: body.agent.name ?? body.agent.id,
    organization: body.agent.organization,
    purpose: body.purpose,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + config.sessionTtlMs).toISOString(),
  });

  return c.json({
    sessionId: session.id,
    protocolVersion: config.product.protocolVersion,
    server: {
      name: config.product.agentName,
      product: config.product.name,
      tagline: config.product.tagline,
      site: config.publicSite,
    },
    capabilities,
    expiresAt: session.expiresAt,
  });
});

v1.post("/intake", zValidator("json", intakeRequestSchema), (c) => {
  const body = c.req.valid("json");
  requireSession(c.get("store"), body.sessionId);
  const intake = c.get("store").putIntake({
    id: createId("intake"),
    sessionId: body.sessionId,
    organization: body.organization,
    contactAgentId: body.contactAgentId,
    meetingPurpose: body.meetingPurpose,
    durationMinutes: body.durationMinutes,
    timezone: body.timezone,
    notes: body.notes,
    createdAt: c.get("now").toISOString(),
  });

  return c.json({
    intakeId: intake.id,
    sessionId: intake.sessionId,
    status: "accepted" as const,
    durationMinutes: intake.durationMinutes,
    timezone: intake.timezone,
  });
});

v1.post("/slots/propose", zValidator("json", proposeSlotsRequestSchema), async (c) => {
  const body = c.req.valid("json");
  requireSession(c.get("store"), body.sessionId);
  const intake = resolveIntake(c.get("store"), body.sessionId, body.intakeId);
  const calendar = c.get("calendar");
  const slots = await calendar.propose({
    timezone: intake.timezone,
    durationMinutes: intake.durationMinutes,
    windowStart: body.windowStart ? new Date(body.windowStart) : undefined,
    windowEnd: body.windowEnd ? new Date(body.windowEnd) : undefined,
    limit: body.limit ?? 5,
  });

  return c.json({
    sessionId: body.sessionId,
    intakeId: intake.id,
    adapter: calendar.kind,
    slots,
  });
});

v1.post(
  "/bookings/confirm",
  zValidator("json", confirmBookingRequestSchema),
  async (c) => {
    const body = c.req.valid("json");
    requireSession(c.get("store"), body.sessionId);
    const intake = resolveIntake(c.get("store"), body.sessionId, body.intakeId);

    let reserved;
    try {
      reserved = await c.get("calendar").reserve(body.slotId);
    } catch (error) {
      if (error instanceof SlotUnavailableError) {
        throw new ApiError(409, "SLOT_UNAVAILABLE", error.message);
      }
      throw error;
    }

    const booking = c.get("store").putBooking({
      id: createId("booking"),
      sessionId: body.sessionId,
      intakeId: intake.id,
      slotId: reserved.id,
      status: "confirmed",
      organization: intake.organization,
      contactAgentId: intake.contactAgentId,
      meetingPurpose: intake.meetingPurpose,
      timezone: reserved.timezone,
      start: reserved.start,
      end: reserved.end,
      attendeeName: body.attendee?.name,
      attendeeEmail: body.attendee?.email,
      icsUid: `${createId("booking")}@keelops.au`,
      createdAt: c.get("now").toISOString(),
    });

    return c.json(toBookingResponse(booking));
  },
);

v1.get("/bookings/:id", (c) => {
  const booking = c.get("store").getBooking(c.req.param("id"));
  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "No booking with that id.");
  }
  const parsed = bookingStatusResponseSchema.parse(toBookingResponse(booking));
  return c.json(parsed);
});

function requireSession(store: MemoryStore, sessionId: string) {
  const session = store.getSession(sessionId);
  if (!session) {
    throw new ApiError(
      401,
      "SESSION_EXPIRED",
      "Handshake again. This session is missing or finished.",
    );
  }
  return session;
}

function resolveIntake(
  store: MemoryStore,
  sessionId: string,
  intakeId?: string,
) {
  const intake = intakeId
    ? store.getIntake(intakeId)
    : store.latestIntakeForSession(sessionId);

  if (!intake || intake.sessionId !== sessionId) {
    throw new ApiError(
      400,
      "INTAKE_REQUIRED",
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
      `Organisation: ${booking.organization}`,
      "This holds a time. A person at Keel still decides pay, send, sign, and lodge.",
      `Site: ${config.publicSite}`,
    ].join("\n"),
  });

  return {
    bookingId: booking.id,
    status: booking.status,
    sessionId: booking.sessionId,
    intakeId: booking.intakeId,
    slot: {
      id: booking.slotId,
      start: booking.start,
      end: booking.end,
      timezone: booking.timezone,
      durationMinutes: Math.round(
        (Date.parse(booking.end) - Date.parse(booking.start)) / 60_000,
      ),
    },
    organization: booking.organization,
    contactAgentId: booking.contactAgentId,
    meetingPurpose: booking.meetingPurpose,
    attendee:
      booking.attendeeName || booking.attendeeEmail
        ? { name: booking.attendeeName, email: booking.attendeeEmail }
        : undefined,
    ics,
    createdAt: booking.createdAt,
  };
}
