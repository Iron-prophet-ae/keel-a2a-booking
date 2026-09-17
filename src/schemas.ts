import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

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
    agent: z.object({
      id: z.string().min(1).max(120).openapi({
        example: "acme-scheduling-agent",
        description: "Stable id of the visiting agent.",
      }),
      name: z.string().min(1).max(160).optional().openapi({
        example: "Acme scheduling desk",
      }),
      organization: z.string().min(1).max(160).optional().openapi({
        example: "Acme Pty Ltd",
      }),
    }),
    purpose: z.string().min(1).max(280).openapi({
      example: "book-meeting",
      description: "Why this agent is calling the Keel booking desk.",
    }),
    protocolVersion: z.string().optional().openapi({ example: "1.0" }),
  })
  .openapi("HandshakeRequest");

export const capabilitySchema = z
  .object({
    id: z.string(),
    method: z.enum(["GET", "POST"]),
    path: z.string(),
    description: z.string(),
  })
  .openapi("Capability");

export const handshakeResponseSchema = z
  .object({
    sessionId: z.string(),
    protocolVersion: z.string(),
    server: z.object({
      name: z.string(),
      product: z.string(),
      tagline: z.string(),
      site: z.string(),
    }),
    capabilities: z.array(capabilitySchema),
    expiresAt: z.string(),
  })
  .openapi("HandshakeResponse");

export const intakeRequestSchema = z
  .object({
    sessionId: z.string().min(1),
    organization: z.string().min(1).max(160).openapi({ example: "Acme Pty Ltd" }),
    contactAgentId: z.string().min(1).max(120).openapi({
      example: "acme-scheduling-agent",
    }),
    meetingPurpose: z.string().min(3).max(400).openapi({
      example: "Map where the week is leaking on job intake",
    }),
    durationMinutes: z
      .union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)])
      .openapi({ example: 30 }),
    timezone: z
      .string()
      .min(1)
      .refine(isValidTimeZone, { message: "timezone must be a valid IANA name" })
      .openapi({ example: "Australia/Sydney" }),
    notes: z.string().max(800).optional(),
  })
  .openapi("IntakeRequest");

export const intakeResponseSchema = z
  .object({
    intakeId: z.string(),
    sessionId: z.string(),
    status: z.literal("accepted"),
    durationMinutes: z.number(),
    timezone: z.string(),
  })
  .openapi("IntakeResponse");

export const proposeSlotsRequestSchema = z
  .object({
    sessionId: z.string().min(1),
    intakeId: z.string().optional(),
    windowStart: z.string().datetime().optional(),
    windowEnd: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(12).optional(),
  })
  .openapi("ProposeSlotsRequest");

export const slotSchema = z
  .object({
    id: z.string(),
    start: z.string(),
    end: z.string(),
    timezone: z.string(),
    durationMinutes: z.number(),
  })
  .openapi("TimeSlot");

export const proposeSlotsResponseSchema = z
  .object({
    sessionId: z.string(),
    intakeId: z.string(),
    adapter: z.string(),
    slots: z.array(slotSchema),
  })
  .openapi("ProposeSlotsResponse");

export const confirmBookingRequestSchema = z
  .object({
    sessionId: z.string().min(1),
    slotId: z.string().min(1),
    intakeId: z.string().optional(),
    attendee: z
      .object({
        name: z.string().min(1).max(160).optional(),
        email: z.string().email().optional(),
      })
      .optional(),
  })
  .openapi("ConfirmBookingRequest");

export const icsPayloadSchema = z
  .object({
    uid: z.string(),
    dtstamp: z.string(),
    dtstart: z.string(),
    dtend: z.string(),
    summary: z.string(),
    description: z.string(),
    location: z.string(),
    organizer: z.string(),
    status: z.literal("CONFIRMED"),
    text: z.string(),
  })
  .openapi("IcsPayload");

export const bookingSchema = z
  .object({
    bookingId: z.string(),
    status: z.enum(["confirmed", "cancelled"]),
    sessionId: z.string(),
    intakeId: z.string(),
    slot: slotSchema,
    organization: z.string(),
    contactAgentId: z.string(),
    meetingPurpose: z.string(),
    attendee: z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
      })
      .optional(),
    ics: icsPayloadSchema,
    createdAt: z.string(),
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
