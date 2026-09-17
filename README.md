# Keel A2A booking desk

Keel public line: **Make work move.** Site: [keelops.au](https://keelops.au).

> If I'm going to have to talk to a clearly AI voice bot, why bother talking… just get your agents to do the talking.

That is the product. **Agent schedules with agent.** This desk is not a nicer receptionist and there is no voice path in v0.

Named host: **https://a2a.keelops.au**. Calendar next: **Motion** (not Cal.com or Google unless Motion is blocked on secrets). Money direction only — cheap easy fix, one-time about $5, volume play. No packages, no pricing UI.

A visiting agent talks to Keel’s booking desk over HTTP JSON (`keel-a2a/0.1`):

**handshake → intake → propose slots → confirm → status**

A confirmed booking **holds a time**. A person at Keel still decides pay, send, sign, and lodge.

This repo does not sell AI and does not invent packages or legal claims.

## What shipped

| Piece | Where |
| --- | --- |
| A2A HTTP JSON API | `src/routes/v1.ts` |
| OpenAPI 3.1 | `GET /openapi.json` and `GET /docs` |
| Booking-desk persona + tool bindings | `src/agent/PERSONA.md`, `GET /v1/agent` |
| Mock calendar + Motion/Cal.com stubs | `src/calendar/` (`CALENDAR_PROVIDER`) |
| Multi-key auth | `KEEL_A2A_API_KEY`, `KEEL_A2A_API_KEYS`, keys file |
| Confirmation out | webhook + `artifacts/{booking_id}.ics` |
| Demo client agent | `scripts/demo-client.ts` (`npm run demo`) |
| Thin status board | `GET /` |
| Agent install card | `docs/AGENT_INSTALL.md` |
| Sticky deploy pack | `Dockerfile`, `fly.toml`, `DEPLOY.md` |

## Run locally

Requires Node 20+.

```bash
npm install
cp .env.example .env
npm start
```

The desk listens on `http://127.0.0.1:47821`.

| URL | What |
| --- | --- |
| `/` | Last bookings (demo board) |
| `/docs` | Human API notes |
| `/openapi.json` | Machine-readable spec |
| `/health` | Liveness |
| `/v1/agent` | System prompt + tool bindings |

Dev reload:

```bash
npm run dev
```

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `KEEL_A2A_API_KEY` | generated into `.data/keel-api-key` if unset | Single `X-Api-Key` (backward compatible) |
| `KEEL_A2A_API_KEYS` | unset | Extra keys, comma-separated |
| `KEEL_A2A_API_KEYS_FILE` | unset | JSON `{customer_id: key}` or `customer_id=key` lines |
| `KEEL_A2A_KEY_FILE` | `.data/keel-api-key` | Where a generated key is persisted |
| `CALENDAR_PROVIDER` | `mock` | `mock` \| `motion` \| `calcom` (fails loud without creds) |
| `BOOKING_WEBHOOK_URL` | unset | POST booking payload on confirm |
| `SMTP_URL` | unset | Reserved; send is skipped when unset |
| `PORT` | `47821` | Listen port |
| `HOST` | `127.0.0.1` (or `0.0.0.0` if `PORT` is set by a host) | Bind address |
| `KEEL_PUBLIC_SITE` | `https://keelops.au` | Public site in copy |
| `KEEL_BASE_URL` | `http://127.0.0.1:47821` | Demo client target |

Do not commit `.env` or `.data/`. `.env.example` is the template.

Named host (after DNS): **https://a2a.keelops.au**. Deploy steps and the Squarespace row: `DEPLOY.md`. Foreign-agent install: `docs/AGENT_INSTALL.md`.

## Demo client (proves A2A without a UI)

With the server running — or on its own, if the default port is free:

```bash
npm run demo
```

The script acts as a **visiting agent**. It completes handshake → intake → propose → confirm → status and prints the `booking_id` on the last line.

## Example curl sequence

```bash
export BASE=http://127.0.0.1:47821
export KEY=keel-demo-key

# 1. Handshake
SESSION=$(curl -sS "$BASE/v1/handshake" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d '{
    "agent_id":"acme-desk",
    "agent_name":"Acme scheduling desk",
    "org":"Acme Pty Ltd",
    "purpose":"schedule_meeting",
    "protocol_version":"keel-a2a/0.1"
  }' | tee /dev/stderr | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).session_id))")

# 2. Intake
curl -sS "$BASE/v1/intake" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d "{
    \"session_id\":\"$SESSION\",
    \"org\":\"Acme Pty Ltd\",
    \"contact\":{\"agent_id\":\"acme-desk\",\"name\":\"Jordan Lee\"},
    \"meeting\":{
      \"purpose\":\"Map where the week is leaking on job intake\",
      \"duration_minutes\":30,
      \"timezone\":\"Australia/Sydney\"
    }
  }"

# 3. Propose slots
curl -sS "$BASE/v1/slots/propose" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d "{
    \"session_id\":\"$SESSION\",
    \"window_start\":\"2026-09-21T00:00:00.000Z\",
    \"window_end\":\"2026-10-03T00:00:00.000Z\",
    \"limit\":5
  }"

# 4. Confirm (replace SLOT)
curl -sS "$BASE/v1/bookings/confirm" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d "{\"session_id\":\"$SESSION\",\"slot_id\":\"SLOT\",\"attendee_email\":\"jordan@acme.example\"}"

# 5. Status (replace BOOKING_ID)
curl -sS "$BASE/v1/bookings/BOOKING_ID" -H "X-Api-Key: $KEY"
```

## How an external agent should call us

1. Read `src/agent/PERSONA.md` and register the tools in `src/agent/tools.ts` (or `GET /v1/agent`).
2. Call the five endpoints in order. Keep `session_id`.
3. Only confirm a `slot_id` from the latest propose response.
4. On `409` / `slot_unavailable`, propose again.

Auth is `X-Api-Key`: one `KEEL_A2A_API_KEY`, or any key in `KEEL_A2A_API_KEYS` / the keys file. Not production OAuth.

## Calendar adapter

Default is `MockCalendarAdapter`: weekday 09:00–16:00 (Sydney hours for the demo).

Calendar is **Motion first**. `CALENDAR_PROVIDER=motion` fails loud without `MOTION_API_KEY`. Do not invent a token. Do not wire Cal.com or Google unless Motion is blocked. Exact human steps: `DEPLOY.md`. Do not change [keelops.au](https://keelops.au).

## Tests

```bash
npm test
```

Covers handshake→book, conflict, multi-key auth, webhook + ICS artifact, and OpenAPI paths.

## Deploy notes

Always-on pack: `Dockerfile`, `fly.toml`, `docker-compose.yml`. Full steps and the Squarespace `a2a` CNAME row: **`DEPLOY.md`**. Named host: `https://a2a.keelops.au`. Memory store resets unless the process stays up.

## Acceptance checklist

- [x] `npm test` passes handshake→book happy path
- [x] `npm run demo` completes a booking and prints a `booking_id`
- [x] OpenAPI documents the five endpoints
- [x] README states the A2A story in plain language
- [x] Copy stays on operations / make work move — A2A is the product, not an “AI receptionist”
