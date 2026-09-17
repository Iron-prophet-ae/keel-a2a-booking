# Keel A2A booking desk

Keel public line: **Make work move.** Site: [keelops.au](https://keelops.au).

> If I'm going to have to talk to a clearly AI voice bot, why bother talking… just get your agents to do the talking.

That is the product. **Agent schedules with agent.** This desk is not a nicer receptionist and there is no voice path in v0.

A visiting agent talks to Keel’s booking desk over HTTP JSON (`keel-a2a/0.1`):

**handshake → intake → propose slots → confirm → status**

A confirmed booking **holds a time**. A person at Keel still decides pay, send, sign, and lodge.

This repo does not sell a product, does not sell AI, and does not quote prices.

## What shipped

| Piece | Where |
| --- | --- |
| A2A HTTP JSON API | `src/routes/v1.ts` |
| OpenAPI 3.1 | `GET /openapi.json` and `GET /docs` |
| Booking-desk persona + tool bindings | `src/agent/PERSONA.md`, `GET /v1/agent` |
| Mock calendar + `CalendarAdapter` | `src/calendar/` (Sydney weekday hours) |
| In-memory store | `src/store/memory-store.ts` |
| Demo client agent | `scripts/demo-client.ts` (`npm run demo`) |
| Thin status board | `GET /` |

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
| `KEEL_A2A_API_KEY` | `keel-demo-key` | Shared demo key (`X-Api-Key`) |
| `PORT` | `47821` | Listen port |
| `HOST` | `127.0.0.1` | Bind address |
| `KEEL_PUBLIC_SITE` | `https://keelops.au` | Public site in copy |
| `KEEL_BASE_URL` | `http://127.0.0.1:47821` | Demo client target |

Do not commit `.env`. `.env.example` is the template.

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

Auth is a **shared demo API key** (`KEEL_A2A_API_KEY`), not production OAuth.

## Calendar adapter

v0 uses `MockCalendarAdapter`: weekday 09:00–16:00 in the requested timezone (Sydney hours for the demo).

Plug a real calendar later by implementing `CalendarAdapter` in `src/calendar/adapter.ts` (`propose`, `getSlot`, `reserve`) and passing it into `createApp({ calendar })`. Motion / Cal.com OAuth is out of scope. A later human Motion sink can sit behind the adapter without changing [keelops.au](https://keelops.au).

## Tests

```bash
npm test
```

Covers the handshake→book happy path, API key rejection, double-book `slot_unavailable`, and OpenAPI path list.

## Deploy notes

Run as a long-lived Node process (`npm start`) behind any TLS terminator. Set `KEEL_A2A_API_KEY` and bind `HOST=0.0.0.0` if you need a public interface. Memory store resets on process restart. Production calendar OAuth and stronger auth are later work.

## Acceptance checklist

- [x] `npm test` passes handshake→book happy path
- [x] `npm run demo` completes a booking and prints a `booking_id`
- [x] OpenAPI documents the five endpoints
- [x] README states the A2A story in plain language
- [x] Copy stays on operations / make work move — A2A is the product, not an “AI receptionist”
