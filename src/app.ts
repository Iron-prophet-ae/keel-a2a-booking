import { Hono } from "hono";
import { cors } from "hono/cors";
import type { CalendarAdapter } from "./calendar/adapter.js";
import { MockCalendarAdapter } from "./calendar/mock-adapter.js";
import { config } from "./config.js";
import type { AppBindings } from "./context.js";
import { ApiError } from "./http.js";
import { buildOpenApiDocument } from "./openapi.js";
import { renderDocsPage } from "./pages/docs.js";
import { renderStatusPage } from "./pages/status.js";
import { v1 } from "./routes/v1.js";
import {
  bookingDeskSystemPrompt,
  howAnExternalAgentCallsUs,
} from "./agent/persona.js";
import { bookingDeskTools } from "./agent/tools.js";
import { MemoryStore } from "./store/memory-store.js";

export type CreateAppOptions = {
  store?: MemoryStore;
  calendar?: CalendarAdapter;
  now?: Date;
  apiKey?: string;
};

export function createApp(options: CreateAppOptions = {}) {
  const store = options.store ?? new MemoryStore();
  const calendar = options.calendar ?? new MockCalendarAdapter();
  const apiKey = options.apiKey ?? config.apiKey;
  const app = new Hono<AppBindings>();

  app.use("*", cors());
  app.use("*", async (c, next) => {
    c.set("store", store);
    c.set("calendar", calendar);
    c.set("now", options.now ?? new Date());
    await next();
  });

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json(
        { error: { code: error.code, message: error.message } },
        error.status as 400,
      );
    }
    console.error(error);
    return c.json(
      {
        error: {
          code: "INTERNAL",
          message: "The desk hit an unexpected snag. Try the last step again.",
        },
      },
      500,
    );
  });

  app.get("/health", (c) =>
    c.json({
      ok: true,
      product: config.product.name,
      tagline: config.product.tagline,
    }),
  );

  app.get("/", (c) =>
    c.html(renderStatusPage(store.recentBookings(config.recentBookingLimit))),
  );

  app.get("/docs", (c) => c.html(renderDocsPage()));
  app.get("/openapi.json", (c) => c.json(buildOpenApiDocument()));
  app.get("/v1/agent", (c) =>
    c.json({
      systemPrompt: bookingDeskSystemPrompt,
      tools: bookingDeskTools,
      howToCall: howAnExternalAgentCallsUs,
    }),
  );

  app.use("/v1/*", async (c, next) => {
    if (c.req.path === "/v1/agent") {
      await next();
      return;
    }
    const provided = c.req.header("x-api-key");
    if (!provided || provided !== apiKey) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Send a valid X-Api-Key header.",
          },
        },
        401,
      );
    }
    await next();
  });

  app.route("/v1", v1);
  return { app, store, calendar };
}
