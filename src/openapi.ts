import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { config } from "./config.js";
import type { ZodTypeAny } from "zod";
import { z } from "zod";
import {
  bookingStatusResponseSchema,
  confirmBookingRequestSchema,
  confirmBookingResponseSchema,
  errorSchema,
  handshakeRequestSchema,
  handshakeResponseSchema,
  intakeRequestSchema,
  intakeResponseSchema,
  proposeSlotsRequestSchema,
  proposeSlotsResponseSchema,
} from "./schemas.js";

const bookingIdParams = z.object({
  id: z.string().openapi({
    param: { name: "id", in: "path" },
    example: "bkg_0f1e2d3c4b5a6978",
    description: "Booking id returned by confirm.",
  }),
});

const registry = new OpenAPIRegistry();

const apiKey = registry.registerComponent("securitySchemes", "apiKey", {
  type: "apiKey",
  in: "header",
  name: "X-Api-Key",
  description: "Shared demo key. Default local value is keel-demo-key.",
});

function jsonBody(schema: ZodTypeAny, description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

registry.registerPath({
  method: "post",
  path: "/v1/handshake",
  summary: "Open an A2A booking session",
  description:
    "A visiting agent identifies itself and why it is calling. Keel returns a session id and the booking capabilities it can honour.",
  tags: ["A2A booking"],
  security: [{ [apiKey.name]: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: handshakeRequestSchema } },
    },
  },
  responses: {
    200: jsonBody(handshakeResponseSchema, "Session opened"),
    400: jsonBody(errorSchema, "Invalid request"),
    401: jsonBody(errorSchema, "Missing or wrong API key"),
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/intake",
  summary: "Submit structured intake",
  description:
    "Collect organisation, contact agent, meeting purpose, duration, and timezone before times are proposed.",
  tags: ["A2A booking"],
  security: [{ [apiKey.name]: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: intakeRequestSchema } },
    },
  },
  responses: {
    200: jsonBody(intakeResponseSchema, "Intake accepted"),
    400: jsonBody(errorSchema, "Invalid request or missing session intake"),
    401: jsonBody(errorSchema, "Missing key or expired session"),
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/slots/propose",
  summary: "Propose available slots",
  description:
    "Returns open times from the calendar adapter. v0 uses a mock weekday desk calendar.",
  tags: ["A2A booking"],
  security: [{ [apiKey.name]: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: proposeSlotsRequestSchema } },
    },
  },
  responses: {
    200: jsonBody(proposeSlotsResponseSchema, "Proposed slots"),
    400: jsonBody(errorSchema, "Intake required"),
    401: jsonBody(errorSchema, "Missing key or expired session"),
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/bookings/confirm",
  summary: "Confirm a proposed slot",
  description:
    "Locks one slot and returns a booking id plus an ICS-friendly payload.",
  tags: ["A2A booking"],
  security: [{ [apiKey.name]: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: confirmBookingRequestSchema } },
    },
  },
  responses: {
    200: jsonBody(confirmBookingResponseSchema, "Booking confirmed"),
    400: jsonBody(errorSchema, "Invalid request"),
    401: jsonBody(errorSchema, "Missing key or expired session"),
    409: jsonBody(errorSchema, "Slot no longer available"),
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/bookings/{id}",
  summary: "Read booking status",
  tags: ["A2A booking"],
  security: [{ [apiKey.name]: [] }],
  request: {
    params: bookingIdParams,
  },
  responses: {
    200: jsonBody(bookingStatusResponseSchema, "Booking status"),
    401: jsonBody(errorSchema, "Missing or wrong API key"),
    404: jsonBody(errorSchema, "Unknown booking"),
  },
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Keel A2A booking desk",
      version: "0.1.0",
      description: [
        "A visiting agent talks to Keel's booking desk: handshake, intake, propose slots, confirm, then read status.",
        "Keel public line: Make work move. This API books a conversation. It does not sell a product and does not take payment.",
        `Public site: ${config.publicSite}`,
      ].join("\n\n"),
    },
    servers: [{ url: "/", description: "This process" }],
    tags: [{ name: "A2A booking", description: "Five-step booking protocol" }],
  });
}
