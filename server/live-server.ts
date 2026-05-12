/**
 * POLARIS GP — Live Telemetry Relay
 * --------------------------------------------------------------
 * Tiny Bun server that:
 *   1) Accepts POST /publish from your local race-control app, and
 *   2) Broadcasts those messages over WebSocket to anyone connected
 *      to /live?token=<LIVE_WS_TOKEN>.
 *
 * Run:
 *   LIVE_WS_TOKEN=mysecret bun run server/live-server.ts
 *
 * Expose globally with Cloudflare Tunnel (free, no public IP):
 *   cloudflared tunnel --url http://localhost:8080
 *   # Copy the printed https://<id>.trycloudflare.com URL.
 *   # Your WS URL becomes wss://<id>.trycloudflare.com/live
 *
 * Set these GitHub repo secrets:
 *   LIVE_WS_URL    = wss://<id>.trycloudflare.com/live
 *   LIVE_WS_TOKEN  = mysecret
 *
 * Publish from your local app (any language) — example with curl:
 *   curl -X POST http://localhost:8080/publish \
 *     -H 'content-type: application/json' \
 *     -d '{"type":"lap_completed","teamId":"mavericks","lap":1,
 *          "lapTimeMs":8342,"fastestLapMs":8342,"averageLapMs":8342,
 *          "sessionBestMs":8342,"isPersonalBest":true,"isSessionBest":true,
 *          "at":1715600000000}'
 *
 * The message schema is documented in assets/js/live.js.
 */

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.LIVE_WS_TOKEN || '';

if (!TOKEN) {
  console.warn('⚠  LIVE_WS_TOKEN not set — connections will be rejected. Set it before running.');
}

// In-memory snapshot, sent to every new client.
let snapshot: any = {
  type: 'session_state',
  session: {
    name: 'Final · Wed May 13',
    startedAt: null,
    durationMs: 7_200_000,
    state: 'pre',
    bestLapMs: null,
    bestLapTeam: null,
  },
  teams: [],
};

type WSData = { id: string };

const server = Bun.serve<WSData>({
  port: PORT,

  fetch(req, srv) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === '/live') {
      const token = url.searchParams.get('token') || '';
      if (!TOKEN || token !== TOKEN) {
        return new Response('Unauthorized', { status: 401 });
      }
      const id = crypto.randomUUID();
      const ok = srv.upgrade(req, { data: { id } });
      return ok ? undefined : new Response('Upgrade failed', { status: 500 });
    }

    // Publish from local app — POST JSON, broadcast to all clients
    if (url.pathname === '/publish' && req.method === 'POST') {
      return req.json().then((msg: any) => {
        if (!msg || typeof msg !== 'object' || !msg.type) {
          return new Response('Bad message', { status: 400 });
        }
        // Keep snapshot fresh
        if (msg.type === 'session_state') {
          snapshot = msg;
        } else {
          applyToSnapshot(msg);
        }
        const payload = JSON.stringify(msg);
        srv.publish('feed', payload);
        return new Response(JSON.stringify({ ok: true, subscribers: srv.subscriberCount('feed') }), {
          headers: { 'content-type': 'application/json' },
        });
      });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, clients: server.subscriberCount('feed') }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response('Polaris GP relay · POST /publish · WS /live?token=…', {
      headers: { 'content-type': 'text/plain' },
    });
  },

  websocket: {
    open(ws) {
      ws.subscribe('feed');
      ws.send(JSON.stringify(snapshot));
      console.log(`+ client ${ws.data.id} (${server.subscriberCount('feed')} total)`);
    },
    message() {
      // Read-only feed — ignore client messages.
    },
    close(ws) {
      console.log(`- client ${ws.data.id} (${server.subscriberCount('feed')} total)`);
    },
  },
});

// Heartbeat every 10s so clients can detect stale connections.
setInterval(() => {
  server.publish('feed', JSON.stringify({ type: 'heartbeat', at: Date.now() }));
}, 10_000);

function applyToSnapshot(msg: any) {
  // Roll up incremental messages into the snapshot so reconnecting
  // clients see a coherent state. Best-effort, low-stakes if wrong.
  if (msg.type === 'lap_completed') {
    const team = snapshot.teams.find((t: any) => t.id === msg.teamId);
    if (team) {
      team.currentLap = msg.lap;
      team.fastestLapMs = msg.fastestLapMs;
      team.averageLapMs = msg.averageLapMs;
      team.lastUpdate = msg.at;
    }
    if (msg.isSessionBest) {
      snapshot.session.bestLapMs = msg.lapTimeMs;
      snapshot.session.bestLapTeam = msg.teamId;
    }
  } else if (msg.type === 'team_status') {
    const team = snapshot.teams.find((t: any) => t.id === msg.teamId);
    if (team) team.status = msg.status;
  } else if (msg.type === 'attempt_started') {
    const team = snapshot.teams.find((t: any) => t.id === msg.teamId);
    if (team) {
      team.attempt = msg.attempt;
      team.currentLap = 0;
      team.fastestLapMs = null;
      team.averageLapMs = null;
      team.status = 'running';
    }
  } else if (msg.type === 'session_ended') {
    snapshot.session.state = 'ended';
  }
}

console.log(`✓ Polaris GP relay listening on :${PORT}`);
console.log(`  WS:  ws://localhost:${PORT}/live?token=…`);
console.log(`  POST http://localhost:${PORT}/publish`);
