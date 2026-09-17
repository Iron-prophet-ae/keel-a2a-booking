import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createCalendarFromEnv } from "../src/calendar/create.js";
import { CalendarCredentialsError } from "../src/calendar/errors.js";
import { MockCalendarAdapter } from "../src/calendar/mock-adapter.js";
import { MemoryStore } from "../src/store/memory-store.js";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

const frozenNow = new Date("2026-09-21T00:00:00.000Z");
const windowStart = "2026-09-21T00:00:00.000Z";
const windowEnd = "2026-10-03T00:00:00.000Z";

function testApp(options: Parameters<typeof createApp>[0] = {}) {
  return createApp({
    store: new MemoryStore(),
    calendar: new MockCalendarAdapter({ now: frozenNow }),
    now: frozenNow,
    artifactsDir: mkdtempSync(join(tmpdir(), "keel-ics-")),
    ...options,
  });
}

async function json(
  app: ReturnType<typeof createApp>["app"],
  method: string,
  path: string,
  body?: unknown,
  key = "k1",
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

async function book(app: ReturnType<typeof createApp>["app"], key: string) {
  const handshake = await json(
    app,
    "POST",
    "/v1/handshake",
    {
      agent_id: "visitor-1",
      purpose: "schedule_meeting",
      protocol_version: "keel-a2a/0.1",
    },
    key,
  );
  const sessionId = handshake.body.session_id as string;
  await json(
    app,
    "POST",
    "/v1/intake",
    {
      session_id: sessionId,
      org: "Northside Plumbing",
      contact: { agent_id: "visitor-1" },
      meeting: {
        purpose: "Name the job that is eating the week",
        duration_minutes: 30,
        timezone: "Australia/Sydney",
      },
    },
    key,
  );
  const proposed = await json(
    app,
    "POST",
    "/v1/slots/propose",
    {
      session_id: sessionId,
      window_start: windowStart,
      window_end: windowEnd,
      limit: 2,
    },
    key,
  );
  const slotId = (proposed.body.slots as Array<{ slot_id: string }>)[0].slot_id;
  return json(
    app,
    "POST",
    "/v1/bookings/confirm",
    { session_id: sessionId, slot_id: slotId },
    key,
  );
}

describe("multi-key auth", () => {
  it("accepts any key in KEEL_A2A_API_KEYS-style list and a customer map", async () => {
    const { app } = testApp({
      apiKeys: ["alpha-key", "beta-key"],
      keyMap: { harbour: "harbour-key" },
    });

    const a = await json(app, "POST", "/v1/handshake", {
      agent_id: "a",
      purpose: "schedule_meeting",
      protocol_version: "keel-a2a/0.1",
    }, "alpha-key");
    const b = await json(app, "POST", "/v1/handshake", {
      agent_id: "b",
      purpose: "schedule_meeting",
      protocol_version: "keel-a2a/0.1",
    }, "harbour-key");
    const denied = await json(app, "POST", "/v1/handshake", {
      agent_id: "c",
      purpose: "schedule_meeting",
      protocol_version: "keel-a2a/0.1",
    }, "nope");

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(denied.status).toBe(401);
  });

  it("keeps a single KEEL_A2A_API_KEY working", async () => {
    const { app } = testApp({ apiKey: "only-one" });
    const ok = await json(
      app,
      "POST",
      "/v1/handshake",
      {
        agent_id: "a",
        purpose: "schedule_meeting",
        protocol_version: "keel-a2a/0.1",
      },
      "only-one",
    );
    expect(ok.status).toBe(200);
  });

  it("loads a customer_id→key JSON file", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "keel-keys-")), "keys.json");
    writeFileSync(file, JSON.stringify({ tayschrenn: "tay-key" }));
    const previous = {
      file: process.env.KEEL_A2A_API_KEYS_FILE,
      single: process.env.KEEL_A2A_API_KEY,
      many: process.env.KEEL_A2A_API_KEYS,
    };
    process.env.KEEL_A2A_API_KEYS_FILE = file;
    delete process.env.KEEL_A2A_API_KEY;
    delete process.env.KEEL_A2A_API_KEYS;

    try {
      const { app } = testApp();
      const ok = await json(
        app,
        "POST",
        "/v1/handshake",
        {
          agent_id: "a",
          purpose: "schedule_meeting",
          protocol_version: "keel-a2a/0.1",
        },
        "tay-key",
      );
      expect(ok.status).toBe(200);
    } finally {
      restoreEnv("KEEL_A2A_API_KEYS_FILE", previous.file);
      restoreEnv("KEEL_A2A_API_KEY", previous.single);
      restoreEnv("KEEL_A2A_API_KEYS", previous.many);
    }
  });
});

describe("confirmation out", () => {
  it("POSTs the booking to BOOKING_WEBHOOK_URL and writes an ICS artifact", async () => {
    const hooks: Array<{ url: string; body: Record<string, unknown> }> = [];
    const artifactsDir = mkdtempSync(join(tmpdir(), "keel-ics-"));
    const { app } = testApp({
      apiKey: "k1",
      webhookUrl: "https://hooks.example.test/keel",
      artifactsDir,
      fetchImpl: async (input, init) => {
        hooks.push({
          url: String(input),
          body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        });
                return new Response("ok", { status: 200 });
      },
    });

    const confirm = await book(app, "k1");
    expect(confirm.status).toBe(200);
    const bookingId = confirm.body.booking_id as string;
    expect(hooks).toHaveLength(1);
    expect(hooks[0].url).toBe("https://hooks.example.test/keel");
    expect(hooks[0].body).toMatchObject({
      event: "booking.confirmed",
      booking: { booking_id: bookingId, status: "confirmed" },
    });
    const ics = readFileSync(join(artifactsDir, `${bookingId}.ics`), "utf8");
    expect(ics).toContain("BEGIN:VCALENDAR");
  });

  it("still confirms when the webhook fails", async () => {
    const { app } = testApp({
      apiKey: "k1",
      webhookUrl: "https://hooks.example.test/down",
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });
    const confirm = await book(app, "k1");
    expect(confirm.status).toBe(200);
    expect(confirm.body.booking_id).toMatch(/^bkg_/);
  });
});

describe("calendar providers", () => {
  const envKeys = [
    "CALENDAR_PROVIDER",
    "MOTION_API_KEY",
    "CALCOM_API_KEY",
  ] as const;
  const snapshot: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (snapshot[key] === undefined) delete process.env[key];
      else process.env[key] = snapshot[key];
    }
  });

  it("fails loud when motion is selected without credentials", () => {
    for (const key of envKeys) snapshot[key] = process.env[key];
    process.env.CALENDAR_PROVIDER = "motion";
    delete process.env.MOTION_API_KEY;
    expect(() => createCalendarFromEnv()).toThrow(CalendarCredentialsError);
  });
});
