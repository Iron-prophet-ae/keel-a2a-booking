import { serve } from "@hono/node-server";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";

const defaultBase = process.env.KEEL_BASE_URL ?? `http://${config.host}:${config.port}`;
const apiKey = process.env.KEEL_API_KEY ?? config.apiKey;

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
    throw new Error(`No booking desk at ${defaultBase}. Start it with npm run start.`);
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

  try {
    const handshake = await request(baseUrl, "POST", "/v1/handshake", {
      agent: {
        id: "demo-visitor-agent",
        name: "Visitor scheduling desk",
        organization: "Harbour Joinery",
      },
      purpose: "book-meeting",
      protocolVersion: "1.0",
    });
    const sessionId = String(handshake.sessionId);
    console.log(`handshake  session ${sessionId}`);
    console.log(
      `capabilities  ${(handshake.capabilities as Array<{ id: string }>)
        .map((item) => item.id)
        .join(", ")}`,
    );

    const intake = await request(baseUrl, "POST", "/v1/intake", {
      sessionId,
      organization: "Harbour Joinery",
      contactAgentId: "demo-visitor-agent",
      meetingPurpose: "Map where job intake is leaking hours this week",
      durationMinutes: 30,
      timezone: "Australia/Sydney",
      notes: "Workshop lead wants a next-step plan, not a product pitch.",
    });
    console.log(`intake     ${intake.intakeId}`);

    const proposed = await request(baseUrl, "POST", "/v1/slots/propose", {
      sessionId,
      intakeId: intake.intakeId,
      limit: 5,
    });
    const slots = proposed.slots as Array<{ id: string; start: string }>;
    if (!slots.length) {
      throw new Error("Desk returned no slots.");
    }
    console.log(`propose    ${slots.length} slots; taking ${slots[0].id}`);

    const booking = await request(baseUrl, "POST", "/v1/bookings/confirm", {
      sessionId,
      slotId: slots[0].id,
      intakeId: intake.intakeId,
      attendee: {
        name: "Sam Cole",
        email: "sam@harbourjoinery.example",
      },
    });

    const status = await request(
      baseUrl,
      "GET",
      `/v1/bookings/${booking.bookingId}`,
    );

    console.log(`confirm    booking ${booking.bookingId}`);
    console.log(`status     ${status.status}`);
    console.log(`ics uid    ${(booking.ics as { uid: string }).uid}`);
    console.log(String(booking.bookingId));
  } finally {
    stop?.();
  }
}

runDemo().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
