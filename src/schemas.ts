import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const protocolVersion = "keel-a2a/0.1" as const;

export const errorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("ErrorResponse");

export const handshakeRequestSchema = z
  .object({
    agent_id: z.string().min(1).max(120).openapi({
      example: "acme-scheduling-agent",
      description: "Stable id of the visiting agent.",
    }),
    agent_name: z.string().min(1).max(160).optional().openapi({
      example: "Acme scheduling desk",
    }),
    org: z.string().min(1).max(160).optional().openapi({
      example: "Acme Pty Ltd",
    }),
    purpose: z.literal("schedule_meeting").openapi({
      example: "schedule_meeting",
    }),
    protocol_version: z.literal(protocolVersion).openapi({
      example: protocolVersion,
    }),
  })
  .openapi("HandshakeRequest");

export const handshakeResponseSchema = z
  .object({
    session_id: z.string(),
    capabilities: z.array(z.string()),
    expires_at: z.string(),
    protocol_version: z.literal(protocolVersion),
  })
  .openapi("HandshakeResponse");

export const intakeRequestSchema = z
  .object({
    session_id: z.string().min(1),
    org: z.string().min(1).max(160).openapi({ example: "Acme Pty Ltd" }),
    contact: z.object({
      name: z.string().min(1).max(160).optional(),
      email: z.string().email().optional(),
      agent_id: z.string().min(1).max(120).openapi({
        example: "acme-scheduling-agent",
      }),
    }),
    meeting: z.object({
      purpose: z.string().min(3).max(400).openapi({
        example: "Map where the week is leaking on job intake",
      }),
      duration_minutes: z
        .union([z.literal(30), z.literal(60), z.literal(90)])
        .openapi({ example: 30 }),
      timezone: z
        .string()
        .min(1)
        .refine(isValidTimeZone, { message: "timezone must be a valid IANA name" })
        .openapi({ example: "Australia/Sydney" }),
      notes: z.string().max(800).optional(),
    }),
  })
  .openapi("IntakeRequest");

export const intakeResponseSchema = z
  .object({
    intake_id: z.string(),
    status: z.literal("ready_for_slots"),
  })
  .openapi("IntakeResponse");

export const proposeSlotsRequestSchema = z
  .object({
    session_id: z.string().min(1),
    window_start: z.string().datetime(),
    window_end: z.string().datetime(),
    limit: z.number().int().min(1).max(12),
  })
  .openapi("ProposeSlotsRequest");

export const slotSchema = z
  .object({
    slot_id: z.string(),
    start: z.string(),
    end: z.string(),
    timezone: z.string(),
  })
  .openapi("TimeSlot");

export const proposeSlotsResponseSchema = z
  .object({
    slots: z.array(slotSchema),
  })
  .openapi("ProposeSlotsResponse");

export const confirmBookingRequestSchema = z
  .object({
    session_id: z.string().min(1),
    slot_id: z.string().min(1),
    attendee_email: z.string().email().optional(),
  })
  .openapi("ConfirmBookingRequest");

export const icsPayloadSchema = z
  .object({
    uid: z.string(),
    summary: z.string(),
    dtstart: z.string(),
    dtend: z.string(),
  })
  .openapi("IcsPayload");

export const bookingSchema = z
  .object({
    booking_id: z.string(),
    status: z.literal("confirmed"),
    slot: slotSchema,
    ics: icsPayloadSchema,
  })
  .openapi("Booking");

export const confirmBookingResponseSchema = bookingSchema.openapi(
  "ConfirmBookingResponse",
);

export const bookingStatusResponseSchema = bookingSchema.openapi(
  "BookingStatusResponse",
);

function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
