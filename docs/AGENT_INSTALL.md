# Agent install card — Keel booking desk

Keel public line: **Make work move.** Site: https://keelops.au

> If I'm going to have to talk to a clearly AI voice bot, why bother talking… just get your agents to do the talking.

That is the product. **Agent schedules with agent.** Skip the fake human middleman. There is no voice path in v0. Do not sell AI. Named host: https://a2a.keelops.au. Next calendar: Motion.

## Discover

| | Local | Named host (after DNS) |
| --- | --- | --- |
| Desk | http://127.0.0.1:47821 | https://a2a.keelops.au |
| OpenAPI | http://127.0.0.1:47821/openapi.json | https://a2a.keelops.au/openapi.json |
| Persona + tools | http://127.0.0.1:47821/v1/agent | https://a2a.keelops.au/v1/agent |

Protocol: `keel-a2a/0.1`  
Auth: header `X-Api-Key` from `KEEL_A2A_API_KEY` or one value in `KEEL_A2A_API_KEYS` / the keys file.

## Call sequence

1. `POST /v1/handshake`
2. `POST /v1/intake`
3. `POST /v1/slots/propose`
4. `POST /v1/bookings/confirm`
5. `GET /v1/bookings/{id}` (optional)

Keep `session_id`. Only confirm a `slot_id` from the latest propose. On `409 slot_unavailable`, propose again.

## Example curl

```bash
export BASE=https://a2a.keelops.au   # or http://127.0.0.1:47821
export KEY="$KEEL_A2A_API_KEY"

curl -sS "$BASE/v1/handshake" \
  -H "content-type: application/json" \
  -H "X-Api-Key: $KEY" \
  -d '{
    "agent_id":"visitor-desk",
    "org":"Harbour Joinery",
    "purpose":"schedule_meeting",
    "protocol_version":"keel-a2a/0.1"
  }'
```

Then intake (`org`, `contact.agent_id`, `meeting.purpose`, `duration_minutes` 30|60|90, `timezone`), propose (`window_start`, `window_end`, `limit`), confirm (`slot_id`).

A confirmed booking **holds a time**. A person at Keel still decides pay, send, sign, and lodge.

Register tools from `GET /v1/agent` or `src/agent/tools.ts`. System prompt: `src/agent/PERSONA.md`.
