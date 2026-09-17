import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MockCalendarAdapter } from "../src/calendar/mock-adapter.js";
import { MemoryStore } from "../src/store/memory-store.js";

const apiKey = "keel-demo-key";
const frozenNow = new Date("2026-09-21T00:00:00.000Z");

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
      agent: {
        id: "visitor-1",
        name: "Visitor desk",
        organization: "Northside Plumbing",
      },
      purpose: "book-meeting",
    });

    expect(handshake.status).toBe(200);
    expect(handshake.body.sessionId).toMatch(/^ses_/);
    expect(handshake.body.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/v1/intake" }),
        expect.objectContaining({ path: "/v1/slots/propose" }),
        expect.objectContaining({ path: "/v1/bookings/confirm" }),
        expect.objectContaining({ path: "/v1/bookings/{id}" }),
      ]),
    );

    const sessionId = handshake.body.sessionId as string;

    const intake = await json(app, "POST", "/v1/intake", {
      sessionId,
      organization: "Northside Plumbing",
      contactAgentId: "visitor-1",
      meetingPurpose: "Name the job that is eating the week",
      durationMinutes: 30,
      timezone: "Australia/Sydney",
    });

    expect(intake.status).toBe(200);
    expect(intake.body.status).toBe("accepted");

    const proposed = await json(app, "POST", "/v1/slots/propose", {
      sessionId,
      intakeId: intake.body.intakeId,
      limit: 3,
    });

    expect(proposed.status).toBe(200);
    const slots = proposed.body.slots as Array<{
      id: string;
      start: string;
      end: string;
    }>;
    expect(slots.length).toBeGreaterThan(0);
    expect(new Date(slots[0].end).getTime()).toBeGreaterThan(
      new Date(slots[0].start).getTime(),
    );

    const confirm = await json(app, "POST", "/v1/bookings/confirm", {
      sessionId,
      slotId: slots[0].id,
      attendee: { name: "Alex North", email: "alex@northside.example" },
    });

    expect(confirm.status).toBe(200);
    expect(confirm.body.bookingId).toMatch(/^bkg_/);
    expect(confirm.body.status).toBe("confirmed");
    expect(confirm.body.ics).toEqual(
      expect.objectContaining({
        status: "CONFIRMED",
        text: expect.stringContaining("BEGIN:VCALENDAR"),
      }),
    );

    const status = await json(
      app,
      "GET",
      `/v1/bookings/${confirm.body.bookingId}`,
    );
    expect(status.status).toBe(200);
    expect(status.body.bookingId).toBe(confirm.body.bookingId);
    expect(status.body.status).toBe("confirmed");
    expect(status.body.meetingPurpose).toBe(
      "Name the job that is eating the week",
    );
  });

  it("rejects a missing API key and a second lock on the same slot", async () => {
    const app = testApp();

    const denied = await json(
      app,
      "POST",
      "/v1/handshake",
      { agent: { id: "x" }, purpose: "book-meeting" },
      "",
    );
    expect(denied.status).toBe(401);

    const handshake = await json(app, "POST", "/v1/handshake", {
      agent: { id: "x" },
      purpose: "book-meeting",
    });
    const sessionId = handshake.body.sessionId as string;
    await json(app, "POST", "/v1/intake", {
      sessionId,
      organization: "West Workshop",
      contactAgentId: "x",
      meetingPurpose: "Cut the chase on approvals",
      durationMinutes: 15,
      timezone: "Australia/Melbourne",
    });
    const proposed = await json(app, "POST", "/v1/slots/propose", { sessionId });
    const slotId = (proposed.body.slots as Array<{ id: string }>)[0].id;

    const first = await json(app, "POST", "/v1/bookings/confirm", {
      sessionId,
      slotId,
    });
    const second = await json(app, "POST", "/v1/bookings/confirm", {
      sessionId,
      slotId,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({
      error: { code: "SLOT_UNAVAILABLE" },
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
