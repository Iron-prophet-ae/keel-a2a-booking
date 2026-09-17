import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MockCalendarAdapter } from "../src/calendar/mock-adapter.js";
import { MemoryStore } from "../src/store/memory-store.js";

const apiKey = "keel-demo-key";
const frozenNow = new Date("2026-09-21T00:00:00.000Z");
const windowStart = "2026-09-21T00:00:00.000Z";
const windowEnd = "2026-10-03T00:00:00.000Z";

function testApp() {
  return createApp({
    store: new MemoryStore(),
    calendar: new MockCalendarAdapter({ now: frozenNow }),
    now: frozenNow,
    apiKey,
  }).app;
}

async function json(
  app: ReturnType<typeof testApp>,
  method: string,
  path: string,
  body?: unknown,
  key = apiKey,
) {
  const response = await app.request(path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

describe("A2A booking happy path", () => {
  it("handshake → intake → propose → confirm → status", async () => {
    const app = testApp();

    const handshake = await json(app, "POST", "/v1/handshake", {
      agent_id: "visitor-1",
      agent_name: "Visitor desk",
      org: "Northside Plumbing",
      purpose: "schedule_meeting",
      protocol_version: "keel-a2a/0.1",
    });

    expect(handshake.status).toBe(200);
    expect(handshake.body.session_id).toMatch(/^ses_/);
    expect(handshake.body.capabilities).toEqual([
      "intake",
      "slots.propose",
      "bookings.confirm",
      "bookings.get",
    ]);

    const sessionId = handshake.body.session_id as string;

    const intake = await json(app, "POST", "/v1/intake", {
      session_id: sessionId,
      org: "Northside Plumbing",
      contact: { agent_id: "visitor-1", name: "Alex North" },
      meeting: {
        purpose: "Name the job that is eating the week",
        duration_minutes: 30,
        timezone: "Australia/Sydney",
      },
    });

    expect(intake.status).toBe(200);
    expect(intake.body.status).toBe("ready_for_slots");
    expect(intake.body.intake_id).toMatch(/^int_/);

    const proposed = await json(app, "POST", "/v1/slots/propose", {
      session_id: sessionId,
      window_start: windowStart,
      window_end: windowEnd,
      limit: 3,
    });

    expect(proposed.status).toBe(200);
    const slots = proposed.body.slots as Array<{
      slot_id: string;
      start: string;
      end: string;
      timezone: string;
    }>;
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].slot_id).toMatch(/^slt_/);
    expect(new Date(slots[0].end).getTime()).toBeGreaterThan(
      new Date(slots[0].start).getTime(),
    );

    const confirm = await json(app, "POST", "/v1/bookings/confirm", {
      session_id: sessionId,
      slot_id: slots[0].slot_id,
      attendee_email: "alex@northside.example",
    });

    expect(confirm.status).toBe(200);
    expect(confirm.body.booking_id).toMatch(/^bkg_/);
    expect(confirm.body.status).toBe("confirmed");
    expect(confirm.body.ics).toEqual(
      expect.objectContaining({
        uid: expect.any(String),
        summary: expect.stringContaining("Keel"),
        dtstart: expect.any(String),
        dtend: expect.any(String),
      }),
    );

    const status = await json(
      app,
      "GET",
      `/v1/bookings/${confirm.body.booking_id}`,
    );
    expect(status.status).toBe(200);
    expect(status.body.booking_id).toBe(confirm.body.booking_id);
    expect(status.body.status).toBe("confirmed");
  });

  it("rejects a missing API key and a second lock on the same slot", async () => {
    const app = testApp();

    const denied = await json(
      app,
      "POST",
      "/v1/handshake",
      {
        agent_id: "x",
        purpose: "schedule_meeting",
        protocol_version: "keel-a2a/0.1",
      },
      "",
    );
    expect(denied.status).toBe(401);

    const handshake = await json(app, "POST", "/v1/handshake", {
      agent_id: "x",
      purpose: "schedule_meeting",
      protocol_version: "keel-a2a/0.1",
    });
    const sessionId = handshake.body.session_id as string;
    await json(app, "POST", "/v1/intake", {
      session_id: sessionId,
      org: "West Workshop",
      contact: { agent_id: "x" },
      meeting: {
        purpose: "Cut the chase on approvals",
        duration_minutes: 60,
        timezone: "Australia/Sydney",
      },
    });
    const proposed = await json(app, "POST", "/v1/slots/propose", {
      session_id: sessionId,
      window_start: windowStart,
      window_end: windowEnd,
      limit: 5,
    });
    const slotId = (proposed.body.slots as Array<{ slot_id: string }>)[0].slot_id;

    const first = await json(app, "POST", "/v1/bookings/confirm", {
      session_id: sessionId,
      slot_id: slotId,
    });
    const second = await json(app, "POST", "/v1/bookings/confirm", {
      session_id: sessionId,
      slot_id: slotId,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({
      error: { code: "slot_unavailable" },
    });
  });
});

describe("docs surfaces", () => {
  it("serves OpenAPI for the five booking endpoints", async () => {
    const app = testApp();
    const response = await app.request("/openapi.json");
    const spec = (await response.json()) as {
      paths: Record<string, unknown>;
    };

    expect(response.status).toBe(200);
    expect(spec.paths).toHaveProperty("/v1/handshake");
    expect(spec.paths).toHaveProperty("/v1/intake");
    expect(spec.paths).toHaveProperty("/v1/slots/propose");
    expect(spec.paths).toHaveProperty("/v1/bookings/confirm");
    expect(spec.paths).toHaveProperty("/v1/bookings/{id}");
  });
});
