/**
 * Tool bindings a host agent (Claude, GPT, another desk) can register.
 * Each tool maps 1:1 to the A2A HTTP JSON API.
 */
export const bookingDeskTools = [
  {
    name: "keel_handshake",
    description: "Open a booking session with Keel and learn what this desk can do.",
    method: "POST",
    path: "/v1/handshake",
    input: {
      agent: { id: "string", name: "string?", organization: "string?" },
      purpose: "string",
      protocolVersion: "string?",
    },
  },
  {
    name: "keel_intake",
    description: "Send structured intake for the open session.",
    method: "POST",
    path: "/v1/intake",
    input: {
      sessionId: "string",
      organization: "string",
      contactAgentId: "string",
      meetingPurpose: "string",
      durationMinutes: "15 | 30 | 45 | 60",
      timezone: "IANA timezone",
      notes: "string?",
    },
  },
  {
    name: "keel_propose_slots",
    description: "Ask Keel for open times that match the intake.",
    method: "POST",
    path: "/v1/slots/propose",
    input: {
      sessionId: "string",
      intakeId: "string?",
      windowStart: "ISO datetime?",
      windowEnd: "ISO datetime?",
      limit: "number?",
    },
  },
  {
    name: "keel_confirm_booking",
    description: "Lock one proposed slot and receive a booking id plus ICS payload.",
    method: "POST",
    path: "/v1/bookings/confirm",
    input: {
      sessionId: "string",
      slotId: "string",
      intakeId: "string?",
      attendee: { name: "string?", email: "string?" },
    },
  },
  {
    name: "keel_booking_status",
    description: "Read a booking by id.",
    method: "GET",
    path: "/v1/bookings/{id}",
    input: { id: "string" },
  },
] as const;
