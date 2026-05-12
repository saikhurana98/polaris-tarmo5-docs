# Polaris GP — Live Telemetry Relay

A tiny Bun WebSocket relay. Your local race-control app POSTs telemetry events;
the relay broadcasts them to anyone viewing `/live` on the public Jekyll site.

## Quick start

```bash
# 1. Install Bun if you don't have it
curl -fsSL https://bun.sh/install | bash

# 2. Run the relay (replace the token with anything random)
LIVE_WS_TOKEN=$(openssl rand -hex 16) bun run server/live-server.ts
```

The token you print above is also what goes into the `LIVE_WS_TOKEN` GitHub
repo secret.

## Expose globally with Cloudflare Tunnel

In a second terminal:

```bash
# Install once: brew install cloudflared (macOS)
cloudflared tunnel --url http://localhost:8080
```

Cloudflare prints a `https://<id>.trycloudflare.com` URL. Your public WebSocket
URL is then:

```
wss://<id>.trycloudflare.com/live
```

## Set the GitHub secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Name            | Value                                          |
|-----------------|------------------------------------------------|
| `LIVE_WS_URL`   | `wss://<id>.trycloudflare.com/live`            |
| `LIVE_WS_TOKEN` | the random token you generated above           |

Then trigger a Pages deploy (push any change to `main`, or run the workflow
manually). The Jekyll build will bake the URL + token into `_data/live.yml`
and the `/live/` page will pick them up.

## Publish a message

Any HTTP client works. Example with `curl`:

```bash
curl -X POST http://localhost:8080/publish \
  -H 'content-type: application/json' \
  -d '{
    "type": "lap_completed",
    "teamId": "mavericks",
    "lap": 3,
    "lapTimeMs": 8342,
    "fastestLapMs": 8342,
    "averageLapMs": 8612,
    "sessionBestMs": 8342,
    "isPersonalBest": true,
    "isSessionBest": true,
    "at": 1715600000000
  }'
```

## Message schema

Full schema is documented at the top of [`assets/js/live.js`](../assets/js/live.js).
Six message types: `session_state`, `lap_completed`, `attempt_started`,
`team_status`, `session_ended`, `heartbeat`.

Team IDs the page expects: `mavericks`, `skibidi`, `orion`, `apex5`,
`theonepieceisreal`, `forceblr`.

### `session.kind` — official vs test

Every `session_state` message must carry a `kind` on the `session`
object. It controls how the public page treats the run:

| Value        | Page behaviour                                       |
|--------------|------------------------------------------------------|
| `"official"` | Red "LIVE · OFFICIAL" badge. Results count.          |
| `"test"`     | Yellow "TEST SESSION" banner. Results do NOT count.  |
| _(absent)_   | Treated as `"test"` for safety.                      |

```json
{
  "type": "session_state",
  "session": {
    "name": "Final",
    "kind": "official",
    "startedAt": 1715600000000,
    "durationMs": 7200000,
    "state": "running",
    "bestLapMs": null,
    "bestLapTeam": null
  },
  "teams": [...]
}
```

The kind is decided by the operator when starting a session and is
immutable for that session's lifetime.

## Endpoints

| Method | Path        | Purpose                                       |
|--------|-------------|-----------------------------------------------|
| `GET`  | `/live`     | WebSocket upgrade. Requires `?token=…`.       |
| `POST` | `/publish`  | Local-only. Posts a JSON message to the bus.  |
| `GET`  | `/health`   | `{ ok, clients }`                             |

The `/publish` endpoint has **no auth** — keep the relay on localhost (or
bind it to a private interface) and let Cloudflare Tunnel publish only the
WebSocket route if you can.
