import { createApp } from "../src/app.js";

const { app } = createApp();

// Vercel Node (Fluid) expects the Web Handler API (`fetch`), not a
// default (req, res) export that returns a Response.
export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  },
};
