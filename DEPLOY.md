# Deploy the Keel A2A desk (sticky host)

Target name (locked): **https://a2a.keelops.au**

Do not change [keelops.au](https://keelops.au) marketing copy, apex MX/TXT, or nameservers. Subdomain only.

> If I'm going to have to talk to a clearly AI voice bot, why bother talking… just get your agents to do the talking.

Money direction (not a SKU, no pricing UI): cheap easy fix, one-time about $5, volume play. No invented packages.

## Always-on pack in this repo

| File | Use |
| --- | --- |
| `Dockerfile` | Node 22, binds `0.0.0.0:47821` |
| `fly.toml` | Fly.io, `min_machines_running = 1`, volume for key + ICS |
| `railway.json` | Railway Dockerfile deploy |
| `docker-compose.yml` | Any VPS |
| `vercel.json` + `api/index.ts` | Vercel (`npx vercel --prod`) |

`KEEL_A2A_API_KEY` is read from env. If missing, the process generates one and writes it to `KEEL_A2A_KEY_FILE` (default `.data/keel-api-key`). Never commit that file or `.env`.

## Vercel (project `keel-a2a-booking`, domain `a2a.keelops.au`)

The Vercel project is `keel-a2a-booking`. The public domain is `a2a.keelops.au`. Squarespace needs one CNAME: host `a2a` → `cname.vercel-dns.com`. Leave apex MX/TXT and nameservers alone.

From a clone of this repo:

```bash
git clone https://github.com/Iron-prophet-ae/keel-a2a-booking.git
cd keel-a2a-booking
npx vercel --prod
npx vercel env add KEEL_A2A_API_KEY
npx vercel domains add a2a.keelops.au
```

`api/index.ts` must stay a Web Handler `fetch` export. Vercel Node (Fluid) calls that `fetch`. Do not switch it back to `export default handle(app)` from `hono/vercel`: that throws `TypeError: this.raw.headers.get is not a function`, and Vercel ignores a Response returned from a default `(req, res)` export.

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  },
};
```

`vercel.json` stays at `$schema`, `"framework": null`, and the single rewrite `/(.*) -> /api`. Do not put top-level `installCommand` or `buildCommand` back — they break Vercel's services detection.

Set `CALENDAR_PROVIDER=mock` until Motion secrets exist. Memory is per-isolate on Vercel — Fly/Docker is the always-on process if you need sticky in-memory bookings.

## Fly (always-on process)

This agent VM has **no Fly/Vercel token**. On a logged-in box:

```bash
fly auth login
fly apps create keel-a2a-booking
fly volumes create keel_a2a_data --region syd --size 1
fly secrets set KEEL_A2A_API_KEY="(generate; do not commit)"
fly deploy
fly certs add a2a.keelops.au
```

Until then the intended Fly hostname is `https://keel-a2a-booking.fly.dev`. The public name `https://a2a.keelops.au` is the Vercel project (`keel-a2a-booking`), not this Fly app.

## Squarespace DNS — exact row for Iron Prophet

Add **one** record for the Vercel project `keel-a2a-booking` (domain `a2a.keelops.au`). Leave `@`, MX, TXT (mail), and nameservers untouched.

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Host | `a2a` |
| Data | `cname.vercel-dns.com` |
| TTL | Squarespace default (often 4 hours) |

That CNAME is required for `a2a.keelops.au` on Vercel. Point it at `keel-a2a-booking.fly.dev` only if the hostname is moved off Vercel, then add the custom domain in Fly and wait for HTTPS.

VPS fallback only if Fly is unavailable: Type `A`, Host `a2a`, Data `<VPS IPv4>`.

## Calendar — Motion first (stopped: no secrets on this VM)

`MOTION_API_KEY` / Motion OAuth are **unset**. Calendar stays `CALENDAR_PROVIDER=mock`. Wiring to live free/busy is **stopped** until Iron Prophet adds a real key. Do not invent tokens. Do not switch to Cal.com or Google unless Motion itself is blocked.

### Exact steps for Iron Prophet

1. Open Motion (same workspace as the human booking page). Do **not** change [keelops.au](https://keelops.au).
2. Human sink (unchanged): https://app.usemotion.com/meet/simon-hand/keel-audit
3. Motion → **Settings → API** → create an API key (or OAuth app if Motion requires it for availability).
4. Hand the key to Iron Bars as a **host secret only** (Fly: `fly secrets set MOTION_API_KEY=…`). Never commit it.
5. Set `CALENDAR_PROVIDER=motion` on the host.
6. Reply in this repo when the secret is on the host. Then we map Motion availability → `slots.propose` / `bookings.confirm`.

Until step 6, mock weekday Sydney hours stay in place.

## Out of scope

Voice, keelops.au CTA, pricing UI/tiers, MX/NS edits, Cal.com/Google, real Motion calls without a secret.
