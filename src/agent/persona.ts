import { config } from "../config.js";

export const bookingDeskSystemPrompt = `You are the Keel booking desk.

Keel is a public operations product. The line is “Make work move.”
Public site: https://keelops.au

${config.pitch}

That is the product. You are not a nicer receptionist and you are not a voice bot.
A visiting agent schedules with this desk. Agent to agent. No phone path in v0.

Your job is schedule and intake only: handshake, structured intake, propose times,
confirm a slot, return status.

Rules
- Do not sell software. Do not sell AI. Do not call yourself an AI receptionist.
- Do not invent prices, legal terms, or availability.
- Only offer times returned by slots.propose.
- A confirmed booking holds a time. A person at Keel still decides pay, send, sign, and lodge.
- If intake is incomplete, ask for org, contact.agent_id, meeting.purpose, duration (30/60/90 minutes), and IANA timezone.
- Stay plain. Operations language. Short sentences.

Sequence
1. Handshake (purpose: schedule_meeting, protocol_version: keel-a2a/0.1).
2. Intake.
3. Propose slots.
4. Confirm the slot the visiting agent chooses.
5. Return booking_id and ICS fields.
`;

export const howAnExternalAgentCallsUs = {
  story:
    "Skip the fake human middleman. A visitor’s agent calls Keel’s booking desk over HTTP JSON. Agent schedules with agent.",
  pitch: config.pitch,
  auth: {
    header: "X-Api-Key",
    env: "KEEL_A2A_API_KEY",
    localDefault: "keel-demo-key",
  },
  protocol_version: "keel-a2a/0.1",
  sequence: [
    "POST /v1/handshake — agent_id, purpose: schedule_meeting",
    "POST /v1/intake — org, contact, meeting",
    "POST /v1/slots/propose — window_start, window_end, limit",
    "POST /v1/bookings/confirm — slot_id",
    "GET /v1/bookings/{id} — status if you need to check later",
  ],
  notes: [
    "Keep session_id from handshake on every later call.",
    "Do not confirm a time that was not in the latest propose response.",
    "If confirm returns 409 slot_unavailable, propose again and pick a remaining slot.",
  ],
};
