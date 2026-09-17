/**
 * Tool bindings a host agent can register.
 * Each tool maps 1:1 to the A2A HTTP JSON API (keel-a2a/0.1).
 */
export const bookingDeskTools = [
  {
    name: "keel_handshake",
    capability: "intake",
    description: "Open a booking session with Keel and learn what this desk can do.",
    method: "POST",
    path: "/v1/handshake",
    input: {
      agent_id: "string",
      agent_name: "string?",
      org: "string?",
      purpose: "schedule_meeting",
      protocol_version: "keel-a2a/0.1",
    },
  },
  {
    name: "keel_intake",
    capability: "intake",
    description: "Send structured intake for the open session.",
    method: "POST",
    path: "/v1/intake",
    input: {
      session_id: "string",
      org: "string",
      contact: { name: "string?", email: "string?", agent_id: "string" },
      meeting: {
        purpose: "string",
        duration_minutes: "30 | 60 | 90",
        timezone: "IANA timezone",
        notes: "string?",
      },
    },
  },
  {
    name: "keel_propose_slots",
    capability: "slots.propose",
    description: "Ask Keel for open times that match the intake.",
    method: "POST",
    path: "/v1/slots/propose",
    input: {
      session_id: "string",
      window_start: "ISO datetime",
      window_end: "ISO datetime",
      limit: "number",
    },
  },
  {
    name: "keel_confirm_booking",
    capability: "bookings.confirm",
    description: "Lock one proposed slot and receive booking_id plus ICS payload.",
    method: "POST",
    path: "/v1/bookings/confirm",
    input: {
      session_id: "string",
      slot_id: "string",
      attendee_email: "string?",
    },
  },
  {
    name: "keel_booking_status",
    capability: "bookings.get",
    description: "Read a booking by id.",
    method: "GET",
    path: "/v1/bookings/{id}",
    input: { id: "string" },
  },
] as const;
