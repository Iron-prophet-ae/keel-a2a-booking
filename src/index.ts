import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { config } from "./config.js";

const { app } = createApp();

serve(
  {
    fetch: app.fetch,
    hostname: config.host,
    port: config.port,
  },
  (info) => {
    const url = `http://${info.address}:${info.port}`;
    console.log(`Keel booking desk listening on ${url}`);
    console.log(`Status board  ${url}/`);
    console.log(`OpenAPI       ${url}/openapi.json`);
    console.log(`Docs          ${url}/docs`);
  },
);
