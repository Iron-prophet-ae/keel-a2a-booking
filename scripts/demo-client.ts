import { serve } from "@hono/node-server";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";

const defaultBase = process.env.KEEL_BASE_URL ?? `http://${config.host}:${config.port}`;
const apiKey = process.env.KEEL_A2A_API_KEY ?? config.apiKey;

type Json = Record<string, unknown>;

async function request(
  baseUrl: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Json> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as Json;
  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed (${response.status}): ${JSON.stringify(json)}`,
    );
  }
  return json;
}

async function isServerUp(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function maybeStartLocalServer(): Promise<{
  baseUrl: string;
  stop?: () => void;
}> {
  if (await isServerUp(defaultBase)) {
    return { baseUrl: defaultBase };
  }

  if (process.env.KEEL_BASE_URL) {
    throw new Error(`No booking desk at ${defaultBase}. Start it with npm start.`);
  }

  const { app } = createApp();
  const server = serve({
    fetch: app.fetch,
    hostname: config.host,
    port: config.port,
  });

  const started = Date.now();
  while (!(await isServerUp(defaultBase))) {
    if (Date.now() - started > 4000) {
      throw new Error("Timed out waiting for the local booking desk.");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return {
    baseUrl: defaultBase,
    stop: () => {
      server.close();
    },
  };
}

async function runDemo() {
  const { baseUrl, stop } = await maybeStartLocalServer();
  console.log(`Client agent → ${baseUrl}`);

  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + 12 * 24 * 60 * 60 * 1000);

  try {
    const handshake = await request(baseUrl, "POST", "/v1/handshake", {
      agent_id: "demo-visitor-agent",
      agent_name: "Visitor scheduling desk",
      org: "Harbour Joinery",
      purpose: "schedule_meeting",
      protocol_version: "keel-a2a/0.1",
    });
    const sessionId = String(handshake.session_id);
    console.log(`handshake  session ${sessionId}`);
    console.log(`capabilities  ${(handshake.capabilities as string[]).join(", ")}`);

    const intake = await request(baseUrl, "POST", "/v1/intake", {
      session_id: sessionId,
      org: "Harbour Joinery",
      contact: {
        name: "Sam Cole",
        email: "sam@harbourjoinery.example",
        agent_id: "demo-visitor-agent",
      },
      meeting: {
        purpose: "Map where job intake is leaking hours this week",
        duration_minutes: 30,
        timezone: "Australia/Sydney",
        notes: "Workshop lead wants a next-step plan, not a product pitch.",
      },
    });
    console.log(`intake     ${intake.intake_id} (${intake.status})`);

    const proposed = await request(baseUrl, "POST", "/v1/slots/propose", {
      session_id: sessionId,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      limit: 5,
    });
    const slots = proposed.slots as Array<{ slot_id: string; start: string }>;
    if (!slots.length) {
      throw new Error("Desk returned no slots.");
    }
    console.log(`propose    ${slots.length} slots; taking ${slots[0].slot_id}`);

    const booking = await request(baseUrl, "POST", "/v1/bookings/confirm", {
      session_id: sessionId,
      slot_id: slots[0].slot_id,
      attendee_email: "sam@harbourjoinery.example",
    });

    const status = await request(
      baseUrl,
      "GET",
      `/v1/bookings/${booking.booking_id}`,
    );

    console.log(`confirm    booking ${booking.booking_id}`);
    console.log(`status     ${status.status}`);
    console.log(`ics uid    ${(booking.ics as { uid: string }).uid}`);
    console.log(String(booking.booking_id));
  } finally {
    stop?.();
  }
}

runDemo().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
