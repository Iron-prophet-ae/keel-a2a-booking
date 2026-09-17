# Deploy the Keel A2A desk (sticky host)

Target name: **https://a2a.keelops.au**

Do not change [keelops.au](https://keelops.au) marketing copy, apex MX/TXT, or nameservers. This is a **subdomain only**.

> If I'm going to have to talk to a clearly AI voice bot, why bother talking… just get your agents to do the talking.

## Always-on pack in this repo

| File | Use |
| --- | --- |
| `Dockerfile` | Node 22, binds `0.0.0.0:47821` |
| `fly.toml` | Fly.io, `min_machines_running = 1`, volume for key + ICS |
| `railway.json` | Railway Dockerfile deploy |
| `docker-compose.yml` | Any VPS |

`KEEL_A2A_API_KEY` is read from env. If missing, the process generates one and writes it to `KEEL_A2A_KEY_FILE` (default `.data/keel-api-key`). Never commit that file or `.env`.

## Fly (preferred once Iron Bars is logged in)

```bash
fly auth login
fly apps create keel-a2a-booking
fly volumes create keel_a2a_data --region syd --size 1
fly secrets set KEEL_A2A_API_KEY="(generate; do not commit)"
fly deploy
```

Public app hostname after create: `https://keel-a2a-booking.fly.dev`

## Railway

```bash
railway login
railway up
railway variables set KEEL_A2A_API_KEY="(generate; do not commit)"
```

## VPS + compose

```bash
cp .env.example .env   # set KEEL_A2A_API_KEY
docker compose up -d --build
```

Point `a2a` at the VPS IPv4 with an A record (below).

## Squarespace DNS — exact row for Iron Prophet

Add **one** record. Leave `@`, MX, TXT (mail), and nameservers untouched.

**If the durable host is Fly** (`keel-a2a-booking.fly.dev`):

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Host | `a2a` |
| Data | `keel-a2a-booking.fly.dev` |
| TTL | Squarespace default (often 4 hours) |

**If the durable host is a VPS** (replace with the real IPv4):

| Field | Value |
| --- | --- |
| Type | `A` |
| Host | `a2a` |
| Data | `<VPS IPv4>` |
| TTL | Squarespace default |

**If the durable host is Vercel** (after `vercel --prod`):

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Host | `a2a` |
| Data | `cname.vercel-dns.com` |
| TTL | Squarespace default |

Then in the host dashboard add custom domain `a2a.keelops.au` and complete HTTPS.

## Calendar (human secrets)

No Motion / Cal.com / Google tokens are in this VM. The desk stays on `CALENDAR_PROVIDER=mock`.

Iron Prophet, when secrets exist:

1. Motion: Settings → API → create key → set `MOTION_API_KEY` and `CALENDAR_PROVIDER=motion` on the host. Do not invent a key. Human page (unchanged marketing site): https://app.usemotion.com/meet/simon-hand/keel-audit
2. Cal.com: Settings → API keys → create key → set `CALCOM_API_KEY` and `CALENDAR_PROVIDER=calcom`.
3. Google free/busy: OAuth client + refresh token. Not wired until those exist.

Adapters **fail loud** if the provider is set without credentials.

## Out of scope

Voice, keelops.au CTA, pricing, MX/NS edits, real Motion OAuth until secrets exist.
