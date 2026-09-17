import { config } from "../config.js";
import type { BookingRecord } from "../store/memory-store.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatWhen(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function renderStatusPage(bookings: BookingRecord[]): string {
  const rows = bookings.length
    ? bookings
        .map(
          (booking) => `
        <tr>
          <td><code>${escapeHtml(booking.id)}</code></td>
          <td><span class="pill">${escapeHtml(booking.status)}</span></td>
          <td>${escapeHtml(booking.org)}</td>
          <td>${escapeHtml(booking.meetingPurpose)}</td>
          <td>${escapeHtml(formatWhen(booking.start, booking.timezone))}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="empty">No bookings yet. Run <code>npm run demo</code> against this server.</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Keel booking desk</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #11140f;
      --ink: #f4f1e8;
      --muted: #b7b3a6;
      --line: #2c3128;
      --card: #1a1e18;
      --accent: #c6d36b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.5;
    }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
    p, td, th, .lede, blockquote { font-family: "Segoe UI", system-ui, sans-serif; }
    .kicker { letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; color: var(--accent); font-family: "Segoe UI", system-ui, sans-serif; }
    h1 { font-size: clamp(32px, 5vw, 48px); font-weight: 500; margin: 8px 0 12px; }
    .lede { color: var(--muted); max-width: 42rem; }
    blockquote {
      margin: 20px 0;
      padding: 12px 16px;
      border-left: 3px solid var(--accent);
      color: var(--ink);
      max-width: 40rem;
    }
    .meta { display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0 28px; color: var(--muted); font-size: 14px; }
    table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--line); }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 14px; }
    th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .pill { display: inline-block; border: 1px solid var(--accent); color: var(--accent); padding: 1px 8px; font-size: 12px; }
    .empty { color: var(--muted); }
    code { font-size: 12px; }
    a { color: var(--accent); }
    footer { margin-top: 28px; color: var(--muted); font-size: 14px; }
    @media (max-width: 640px) {
      table { display: block; overflow-x: auto; }
      th, td { font-size: 13px; }
    }
  </style>
</head>
<body>
  <main>
    <p class="kicker">Keel · booking desk</p>
    <h1>${escapeHtml(config.product.tagline)}</h1>
    <blockquote>${escapeHtml(config.pitch)}</blockquote>
    <p class="lede">
      Agent schedules with agent. This desk holds a time after handshake, intake, proposed slots, and confirm.
      This page is a demo board — not the public site.
    </p>
    <div class="meta">
      <span>Last ${bookings.length} of ${config.recentBookingLimit} shown</span>
      <a href="/docs">API docs</a>
      <a href="/openapi.json">openapi.json</a>
      <a href="${escapeHtml(config.publicSite)}">keelops.au</a>
    </div>
    <table>
      <thead>
        <tr>
          <th>Booking</th>
          <th>Status</th>
          <th>Organisation</th>
          <th>Purpose</th>
          <th>When</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <footer>People still decide pay, send, sign, and lodge. This desk only holds a time.</footer>
  </main>
</body>
</html>`;
}
