export const config = {
  port: Number(process.env.PORT ?? 47821),
  host: process.env.HOST ?? "127.0.0.1",
  apiKey: process.env.KEEL_API_KEY ?? "keel-demo-key",
  publicSite: process.env.KEEL_PUBLIC_SITE ?? "https://keelops.au",
  sessionTtlMs: 60 * 60 * 1000,
  recentBookingLimit: 20,
  product: {
    name: "Keel",
    tagline: "Make work move",
    agentName: "keel-booking-desk",
    protocolVersion: "1.0",
    organizerEmail: "booking@keelops.au",
  },
} as const;
