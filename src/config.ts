export const config = {
  port: Number(process.env.PORT ?? 47821),
  host: process.env.HOST ?? "127.0.0.1",
  apiKey: process.env.KEEL_A2A_API_KEY ?? "keel-demo-key",
  publicSite: process.env.KEEL_PUBLIC_SITE ?? "https://keelops.au",
  sessionTtlMs: 60 * 60 * 1000,
  recentBookingLimit: 20,
  product: {
    name: "Keel",
    tagline: "Make work move",
    agentName: "keel-booking-desk",
    protocolVersion: "keel-a2a/0.1",
    organizerEmail: "booking@keelops.au",
  },
  pitch:
    "If I'm going to have to talk to a clearly AI voice bot, why bother talking… just get your agents to do the talking.",
} as const;
