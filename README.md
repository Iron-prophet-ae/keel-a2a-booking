# Keel A2A booking desk

Keel public line: **Make work move.** Site: [keelops.au](https://keelops.au).

This is a v0 **agent-to-agent booking desk**. A visitor’s agent talks to Keel’s booking agent over HTTP JSON:

**handshake → intake → propose slots → confirm → status**

No phone. No voice clone. No human receptionist in the middle. A confirmed booking **holds a time**. A person at Keel still decides pay, send, sign, and lodge.

This repo does not sell a product and does not quote prices.

## What shipped

| Piece | Where |
| --- | --- |
| A2A HTTP JSON API | `src/routes/v1.ts` |
| OpenAPI 3.1 | `GET /openapi.json` and `GET /docs` |
| Booking-desk persona + tool bindings | `src/agent/`, also `GET /v1/agent` |
| Mock calendar + `CalendarAdapter` | `src/calendar/` |
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
| `KEEL_API_KEY` | `keel-demo-key` | Shared demo key (`X-Api-Key`) |
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

The script acts as a **visiting agent**. It completes handshake → intake → propose → confirm → status and prints the booking id on the last line.

## Example curl sequence

```bash
export BASE=http://127.0.0.1:47821
export KEY=keel-demo-key

# 1. Handshake
SESSION=$(curl -sS "$BASE/v1/handshake" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d '{
    "agent": {"id":"acme-desk","name":"Acme scheduling desk","organization":"Acme Pty Ltd"},
    "purpose":"book-meeting",
    "protocolVersion":"1.0"
  }' | tee /dev/stderr | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).sessionId))")

# 2. Intake
curl -sS "$BASE/v1/intake" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d "{
    \"sessionId\":\"$SESSION\",
    \"organization\":\"Acme Pty Ltd\",
    \"contactAgentId\":\"acme-desk\",
    \"meetingPurpose\":\"Map where the week is leaking on job intake\",
    \"durationMinutes\":30,
    \"timezone\":\"Australia/Sydney\"
  }"

# 3. Propose slots
curl -sS "$BASE/v1/slots/propose" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d "{\"sessionId\":\"$SESSION\",\"limit\":5}"

# 4. Confirm (replace SLOT)
curl -sS "$BASE/v1/bookings/confirm" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d "{
    \"sessionId\":\"$SESSION\",
    \"slotId\":\"SLOT\",
    \"attendee\":{\"name\":\"Jordan Lee\",\"email\":\"jordan@acme.example\"}
  }"

# 5. Status (replace BOOKING_ID)
curl -sS "$BASE/v1/bookings/BOOKING_ID" -H "X-Api-Key: $KEY"
```

## How an external agent should call us

1. Register the tools in `src/agent/tools.ts` (or `GET /v1/agent`).
2. Load the system prompt in `src/agent/persona.ts`.
3. Call the five endpoints in order. Keep `sessionId`.
4. Only confirm a `slotId` from the latest propose response.
5. On `409 SLOT_UNAVAILABLE`, propose again.

Auth is a **shared demo API key**, not production OAuth.

## Calendar adapter

v0 uses `MockCalendarAdapter`: weekday 09:00–16:00 in the requested timezone.

Plug a real calendar later by implementing `CalendarAdapter` in `src/calendar/adapter.ts` (`propose`, `getSlot`, `reserve`) and passing it into `createApp({ calendar })`. Motion / Cal.com OAuth is out of scope here.

## Tests

```bash
npm test
```

Covers the handshake→book happy path, API key rejection, double-book conflict, and OpenAPI path list.

## Deploy notes

Run as a long-lived Node process (`npm start`) behind any TLS terminator. Set `KEEL_API_KEY` and bind `HOST=0.0.0.0` if you need a public interface. Memory store resets on process restart. Production calendar OAuth and stronger auth are later work.

## Acceptance checklist

- [x] `npm test` passes handshake→book happy path
- [x] `npm run demo` completes a booking and prints a booking id
- [x] OpenAPI documents the five endpoints
- [x] README states the A2A story in plain language
- [x] Copy stays on operations / make work move — not “AI receptionist”
