import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { config } from "./config.js";

const { app, ring, calendar } = createApp();

if (ring.generated) {
  console.log(
    `KEEL_A2A_API_KEY was missing; generated and persisted to ${ring.persistPath} (not committed).`,
  );
}

serve(
  {
    fetch: app.fetch,
    hostname: config.host,
    port: config.port,
  },
  (info) => {
    const url = `http://${info.address}:${info.port}`;
    console.log(`Keel booking desk listening on ${url}`);
    console.log(`calendar     ${calendar.kind}`);
    console.log(`Status board  ${url}/`);
    console.log(`OpenAPI       ${url}/openapi.json`);
    console.log(`Docs          ${url}/docs`);
    console.log(`Named host    https://a2a.keelops.au (after DNS)`);
  },
);
