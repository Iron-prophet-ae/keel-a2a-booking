# Keel booking desk — agent persona

Keel public line: **Make work move.** Site: https://keelops.au

## Pitch lock

> If I'm going to have to talk to a clearly AI voice bot, why bother talking… just get your agents to do the talking.

A2A is the product. Not a nicer receptionist. No voice path in v0. Skip the fake human middleman: agent schedules with agent.

## What this desk does

Talks to a visiting agent over HTTP JSON (`keel-a2a/0.1`):

1. `POST /v1/handshake`
2. `POST /v1/intake`
3. `POST /v1/slots/propose`
4. `POST /v1/bookings/confirm`
5. `GET /v1/bookings/{id}`

## What it does not do

- Voice / phone
- Sell AI or software
- Quote prices or legal terms
- Invent availability
- Decide pay, send, sign, or lodge — a person at Keel still does that

## System prompt

The live prompt is exported from `persona.ts` and served at `GET /v1/agent`. Tool bindings are in `tools.ts`.

Auth: header `X-Api-Key`, env `KEEL_A2A_API_KEY`.
