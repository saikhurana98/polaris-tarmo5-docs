/* ============================================================
   POLARIS GP — Live Telemetry Client
   ============================================================

   WIRE PROTOCOL — WebSocket, JSON messages, server → client.
   Connect: wss://<host>/?token=<token>
   Server validates token, then streams messages.

   Message types:

   1. session_state — full snapshot, sent on connect and on reconnect.
      {
        type: "session_state",
        session: {
          name: string,           // "Final · Wed May 13"
          startedAt: number,      // ms epoch, null if not started
          durationMs: number,     // session window length (default 7_200_000 = 2h)
          state: "pre"|"running"|"ended",
          bestLapMs: number|null,
          bestLapTeam: string|null
        },
        teams: TeamState[]
      }

      TeamState = {
        id: string,               // "mavericks" — matches data-team in HTML
        car: number,
        name: string,
        attempt: number,
        currentLap: number,       // 0 = not started, 1..totalLaps in progress
        totalLaps: number,        // default 5
        fastestLapMs: number|null,
        averageLapMs: number|null,
        status: "idle"|"running"|"completed"|"dnf",
        lastUpdate: number
      }

   2. lap_completed — a team has just finished a lap.
      {
        type: "lap_completed",
        teamId: string,
        lap: number,              // which lap (1..N)
        lapTimeMs: number,
        fastestLapMs: number,     // team fastest AFTER this lap
        averageLapMs: number,     // team avg AFTER this lap
        sessionBestMs: number|null,
        isPersonalBest: boolean,
        isSessionBest: boolean,
        at: number
      }

   3. attempt_started — team starts a fresh attempt.
      { type: "attempt_started", teamId, attempt, at }

   4. team_status — status change without a lap.
      { type: "team_status", teamId, status, at }

   5. session_ended — final session bell.
      { type: "session_ended", at }

   6. heartbeat — keepalive, every 10s.
      { type: "heartbeat", at }

   ============================================================ */

(function() {
  'use strict';

  const TEAMS = [
    { id: 'mavericks',        car: 1,  name: 'Mavericks' },
    { id: 'skibidi',          car: 2,  name: 'Skibidi' },
    { id: 'orion',            car: 3,  name: 'Orion' },
    { id: 'apex5',            car: 5,  name: 'Apex 5' },
    { id: 'theonepieceisreal', car: 11, name: 'TheOnePieceIsReal' },
    { id: 'forceblr',         car: 14, name: 'ForceBLR' }
  ];

  const TOTAL_LAPS = 5;
  const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2h
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- State ----------
  const state = {
    session: {
      name: 'Final · Wed May 13',
      startedAt: Date.now(),
      durationMs: SESSION_DURATION_MS,
      sessionState: 'running',
      bestLapMs: null,
      bestLapTeam: null
    },
    teams: new Map(),
    connection: 'connecting'  // 'connecting' | 'live' | 'stale' | 'mock' | 'offline'
  };

  TEAMS.forEach((t, i) => {
    state.teams.set(t.id, {
      id: t.id,
      car: t.car,
      name: t.name,
      attempt: 1,
      currentLap: 0,
      totalLaps: TOTAL_LAPS,
      fastestLapMs: null,
      averageLapMs: null,
      lapTimes: [],
      status: 'idle',
      lastUpdate: 0,
      lastPosition: i + 1
    });
  });

  // ---------- DOM refs ----------
  const tower = document.getElementById('timing-tower');
  const rows = new Map();
  if (tower) {
    tower.querySelectorAll('.timing-row').forEach(row => {
      rows.set(row.getAttribute('data-team'), row);
    });
  }
  const paceRows = new Map();
  document.querySelectorAll('.pace-row').forEach(row => {
    paceRows.set(row.getAttribute('data-team'), row);
  });

  const els = {
    pulse: document.querySelector('.live-pulse'),
    stateLabel: document.getElementById('live-state-label'),
    sourceLabel: document.getElementById('live-source-label'),
    clock: document.getElementById('session-clock'),
    sessionName: document.getElementById('session-name'),
    sessionBest: document.getElementById('session-best'),
    feedLog: document.getElementById('feed-log')
  };

  // ---------- Formatting ----------
  function fmtLap(ms) {
    if (ms == null) return '—';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const mmm = Math.floor(ms % 1000);
    return `${m}:${String(s).padStart(2, '0')}:${String(mmm).padStart(3, '0')}`;
  }
  function fmtGap(ms) {
    if (ms == null || ms === 0) return '—';
    const sign = ms > 0 ? '+' : '−';
    const a = Math.abs(ms);
    return `${sign}${(a / 1000).toFixed(3)}`;
  }
  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  function fmtFeedTime(ms) {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  // ---------- Sort & rank ----------
  function rankedTeams() {
    const arr = Array.from(state.teams.values());
    arr.sort((a, b) => {
      // DNFs to the bottom
      if (a.status === 'dnf' && b.status !== 'dnf') return 1;
      if (b.status === 'dnf' && a.status !== 'dnf') return -1;
      // Teams with data above teams with none
      const aHas = a.averageLapMs != null;
      const bHas = b.averageLapMs != null;
      if (aHas && !bHas) return -1;
      if (bHas && !aHas) return 1;
      // Both have data: lower average wins
      if (aHas && bHas) {
        if (a.averageLapMs !== b.averageLapMs) return a.averageLapMs - b.averageLapMs;
      }
      // Tie-break: more laps completed
      if (a.currentLap !== b.currentLap) return b.currentLap - a.currentLap;
      // Final: by car number to be stable
      return a.car - b.car;
    });
    return arr;
  }

  // ---------- Render ----------
  function renderConnection() {
    if (!els.pulse) return;
    els.pulse.classList.remove('is-stale', 'is-dead');
    let label = 'CONNECTING';
    let source = 'Awaiting telemetry';
    if (state.connection === 'live') {
      label = 'LIVE';
      source = 'Race Control Feed';
    } else if (state.connection === 'mock') {
      label = 'SIMULATED';
      source = 'No live feed · showing demo';
      els.pulse.classList.add('is-stale');
    } else if (state.connection === 'stale') {
      label = 'STALE';
      source = 'No data for 30s';
      els.pulse.classList.add('is-stale');
    } else if (state.connection === 'offline') {
      label = 'OFFLINE';
      source = 'Reconnecting…';
      els.pulse.classList.add('is-dead');
    }
    if (els.stateLabel) els.stateLabel.textContent = label;
    if (els.sourceLabel) els.sourceLabel.textContent = source;
  }

  function renderClock() {
    if (!els.clock) return;
    const elapsed = state.session.startedAt ? Date.now() - state.session.startedAt : 0;
    els.clock.textContent = fmtClock(Math.min(elapsed, state.session.durationMs));
  }

  function renderSessionBest() {
    if (!els.sessionBest) return;
    if (state.session.bestLapMs == null) {
      els.sessionBest.textContent = '—';
    } else {
      const team = state.session.bestLapTeam ? state.teams.get(state.session.bestLapTeam) : null;
      els.sessionBest.textContent = `${fmtLap(state.session.bestLapMs)}${team ? ' · ' + team.name : ''}`;
    }
  }

  function captureRects() {
    const out = new Map();
    rows.forEach((row, id) => out.set(id, row.getBoundingClientRect()));
    return out;
  }

  function playFlip(oldRects) {
    if (REDUCED_MOTION) return;
    rows.forEach((row, id) => {
      const oldR = oldRects.get(id);
      if (!oldR) return;
      const newR = row.getBoundingClientRect();
      const dy = oldR.top - newR.top;
      if (Math.abs(dy) < 1) return;
      row.style.transition = 'none';
      row.style.transform = `translateY(${dy}px)`;
      // force reflow
      void row.offsetHeight;
      row.style.transition = '';
      row.style.transform = '';
    });
  }

  function renderRows() {
    const ranked = rankedTeams();
    const leaderAvg = ranked[0] && ranked[0].averageLapMs != null ? ranked[0].averageLapMs : null;
    const leaderId = ranked[0] ? ranked[0].id : null;

    ranked.forEach((team, idx) => {
      const pos = idx + 1;
      const row = rows.get(team.id);
      if (!row) return;
      row.style.order = String(pos);
      row.classList.toggle('is-leader', team.id === leaderId);
      row.classList.toggle('is-running', team.status === 'running');
      row.classList.toggle('is-dnf', team.status === 'dnf');

      const posNum = row.querySelector('.t-pos-num');
      if (posNum) posNum.textContent = String(pos);

      const delta = pos - team.lastPosition;
      const deltaEl = row.querySelector('.t-pos-delta');
      if (deltaEl) {
        deltaEl.classList.remove('t-pos-delta--up', 't-pos-delta--down', 't-pos-delta--same');
        if (delta === 0) {
          deltaEl.classList.add('t-pos-delta--same');
          deltaEl.textContent = '—';
        } else if (delta < 0) {
          deltaEl.classList.add('t-pos-delta--up');
          deltaEl.textContent = `▲ ${Math.abs(delta)}`;
        } else {
          deltaEl.classList.add('t-pos-delta--down');
          deltaEl.textContent = `▼ ${delta}`;
        }
      }

      // car & team text already correct from server-render; just keep in sync
      const teamName = row.querySelector('.t-team-name');
      if (teamName) teamName.textContent = team.name;

      // lap pips
      const pips = row.querySelectorAll('.t-lap-pip');
      pips.forEach((pip, i) => {
        pip.classList.remove('filled', 'current');
        if (i + 1 < team.currentLap) pip.classList.add('filled');
        else if (i + 1 === team.currentLap && team.status === 'running') pip.classList.add('current');
        else if (i + 1 <= team.currentLap) pip.classList.add('filled');
      });

      // attempt
      const attemptVal = row.querySelector('.t-attempt .t-cell-value');
      if (attemptVal) attemptVal.textContent = String(team.attempt);

      // fastest
      const fastestVal = row.querySelector('.t-fastest .t-cell-value');
      if (fastestVal) {
        fastestVal.textContent = fmtLap(team.fastestLapMs);
        fastestVal.classList.toggle('t-cell-value--purple',
          team.fastestLapMs != null && team.fastestLapMs === state.session.bestLapMs);
      }

      // avg
      const avgVal = row.querySelector('.t-avg .t-cell-value');
      if (avgVal) avgVal.textContent = fmtLap(team.averageLapMs);

      // gap
      const gapVal = row.querySelector('.t-gap .t-cell-value');
      if (gapVal) {
        if (team.id === leaderId && team.averageLapMs != null) {
          gapVal.textContent = 'LEADER';
        } else if (leaderAvg != null && team.averageLapMs != null) {
          gapVal.textContent = fmtGap(team.averageLapMs - leaderAvg);
        } else {
          gapVal.textContent = '—';
        }
      }

      team.lastPosition = pos;
    });
  }

  function renderPace() {
    const teams = Array.from(state.teams.values());
    const withAvg = teams.filter(t => t.averageLapMs != null).map(t => t.averageLapMs);
    if (!withAvg.length) return;
    const min = Math.min(...withAvg);
    const max = Math.max(...withAvg);
    const range = Math.max(max - min, 1);
    const leader = rankedTeams()[0];

    teams.forEach(team => {
      const row = paceRows.get(team.id);
      if (!row) return;
      const bar = row.querySelector('.pace-bar');
      const val = row.querySelector('.pace-value');
      row.classList.toggle('is-leader', leader && team.id === leader.id);
      if (team.averageLapMs == null) {
        if (bar) bar.style.width = '0%';
        if (val) val.textContent = '—';
        return;
      }
      // Faster = shorter visual bar. Slowest = 100%.
      const pct = 30 + ((team.averageLapMs - min) / range) * 70;
      if (bar) bar.style.width = `${pct}%`;
      if (val) val.textContent = fmtLap(team.averageLapMs);
    });
  }

  function render() {
    const oldRects = captureRects();
    renderRows();
    playFlip(oldRects);
    renderPace();
    renderSessionBest();
    renderConnection();
  }

  // ---------- Feed log ----------
  function logEvent(type, body, evtClass) {
    if (!els.feedLog) return;
    const line = document.createElement('div');
    line.className = 'feed-line';
    line.innerHTML = `
      <span class="feed-line-time">${fmtFeedTime(Date.now())}</span>
      <span class="feed-line-type ${evtClass || ''}">${type}</span>
      <span class="feed-line-body"></span>
    `;
    line.querySelector('.feed-line-body').textContent = body;
    els.feedLog.insertBefore(line, els.feedLog.firstChild);
    // Cap to 30 lines
    while (els.feedLog.children.length > 30) {
      els.feedLog.removeChild(els.feedLog.lastChild);
    }
  }

  // ---------- Message handlers ----------
  function applySessionState(msg) {
    if (msg.session) {
      Object.assign(state.session, {
        name: msg.session.name || state.session.name,
        startedAt: msg.session.startedAt || state.session.startedAt,
        durationMs: msg.session.durationMs || state.session.durationMs,
        sessionState: msg.session.state || state.session.sessionState,
        bestLapMs: msg.session.bestLapMs ?? state.session.bestLapMs,
        bestLapTeam: msg.session.bestLapTeam ?? state.session.bestLapTeam
      });
      if (els.sessionName && msg.session.name) els.sessionName.textContent = msg.session.name;
    }
    if (Array.isArray(msg.teams)) {
      msg.teams.forEach(t => {
        const existing = state.teams.get(t.id);
        if (!existing) return;
        Object.assign(existing, {
          attempt: t.attempt ?? existing.attempt,
          currentLap: t.currentLap ?? existing.currentLap,
          fastestLapMs: t.fastestLapMs ?? existing.fastestLapMs,
          averageLapMs: t.averageLapMs ?? existing.averageLapMs,
          status: t.status ?? existing.status,
          lastUpdate: t.lastUpdate ?? Date.now()
        });
      });
    }
    render();
  }

  function applyLapCompleted(msg) {
    const team = state.teams.get(msg.teamId);
    if (!team) return;
    team.currentLap = msg.lap;
    team.fastestLapMs = msg.fastestLapMs;
    team.averageLapMs = msg.averageLapMs;
    team.status = msg.lap >= team.totalLaps ? 'completed' : 'running';
    team.lastUpdate = msg.at || Date.now();
    if (msg.isSessionBest) {
      state.session.bestLapMs = msg.lapTimeMs;
      state.session.bestLapTeam = msg.teamId;
    } else if (msg.sessionBestMs != null) {
      state.session.bestLapMs = msg.sessionBestMs;
    }
    render();

    const row = rows.get(msg.teamId);
    if (row && !REDUCED_MOTION) {
      row.classList.remove('flash-lap');
      void row.offsetWidth;
      row.classList.add('flash-lap');
      setTimeout(() => row.classList.remove('flash-lap'), 700);
    }

    let line = `${team.name} · Lap ${msg.lap}/${team.totalLaps} · ${fmtLap(msg.lapTimeMs)}`;
    if (msg.isSessionBest) line += ' · session best';
    else if (msg.isPersonalBest) line += ' · personal best';
    logEvent('LAP', line);
  }

  function applyAttemptStarted(msg) {
    const team = state.teams.get(msg.teamId);
    if (!team) return;
    team.attempt = msg.attempt;
    team.currentLap = 0;
    team.fastestLapMs = null;
    team.averageLapMs = null;
    team.lapTimes = [];
    team.status = 'running';
    render();
    logEvent('START', `${team.name} · Attempt ${msg.attempt}`, 'evt-info');
  }

  function applyTeamStatus(msg) {
    const team = state.teams.get(msg.teamId);
    if (!team) return;
    team.status = msg.status;
    render();
    logEvent('STATUS', `${team.name} · ${msg.status.toUpperCase()}`,
      msg.status === 'dnf' ? 'evt-warn' : 'evt-info');
  }

  function dispatch(msg) {
    if (!msg || typeof msg !== 'object' || !msg.type) return;
    if (msg.type === 'session_state') applySessionState(msg);
    else if (msg.type === 'lap_completed') applyLapCompleted(msg);
    else if (msg.type === 'attempt_started') applyAttemptStarted(msg);
    else if (msg.type === 'team_status') applyTeamStatus(msg);
    else if (msg.type === 'session_ended') {
      state.session.sessionState = 'ended';
      logEvent('END', 'Session ended · checkered flag', 'evt-info');
      render();
    } else if (msg.type === 'heartbeat') {
      lastHeartbeat = Date.now();
    }
  }

  // ---------- WebSocket connection ----------
  let socket = null;
  let reconnectAttempt = 0;
  let reconnectTimer = null;
  let lastHeartbeat = 0;
  let staleTimer = null;
  let mockTimer = null;
  let mockRunning = false;

  function connect() {
    const url = (window.LIVE_CONFIG && window.LIVE_CONFIG.wsUrl) || '';
    const token = (window.LIVE_CONFIG && window.LIVE_CONFIG.wsToken) || '';
    if (!url) {
      logEvent('INFO', 'No WS endpoint configured — starting simulated stream', 'evt-info');
      startMock();
      return;
    }
    let connectUrl = url;
    if (token) {
      connectUrl += (url.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(token);
    }

    state.connection = 'connecting';
    renderConnection();
    logEvent('WS', `Connecting to ${url.replace(/^wss?:\/\//, '').split('?')[0]}…`, 'evt-info');

    try {
      socket = new WebSocket(connectUrl);
    } catch (err) {
      logEvent('WS', `Connect failed: ${err.message || err}`, 'evt-warn');
      scheduleReconnect();
      return;
    }

    socket.addEventListener('open', () => {
      reconnectAttempt = 0;
      lastHeartbeat = Date.now();
      state.connection = 'live';
      stopMock();
      renderConnection();
      logEvent('WS', 'Connected · awaiting state snapshot', 'evt-info');
    });

    socket.addEventListener('message', (ev) => {
      lastHeartbeat = Date.now();
      try {
        const msg = JSON.parse(ev.data);
        dispatch(msg);
      } catch (err) {
        logEvent('WS', `Bad message: ${err.message}`, 'evt-warn');
      }
    });

    socket.addEventListener('error', () => {
      logEvent('WS', 'Socket error', 'evt-warn');
    });

    socket.addEventListener('close', (ev) => {
      logEvent('WS', `Disconnected (code ${ev.code})`, 'evt-warn');
      socket = null;
      scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectAttempt += 1;
    if (reconnectAttempt > 5) {
      logEvent('WS', 'Giving up · falling back to simulated stream', 'evt-warn');
      state.connection = 'mock';
      renderConnection();
      startMock();
      return;
    }
    const wait = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt - 1));
    state.connection = 'offline';
    renderConnection();
    logEvent('WS', `Retry #${reconnectAttempt} in ${(wait / 1000).toFixed(0)}s`, 'evt-info');
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, wait);
  }

  function checkStale() {
    if (state.connection !== 'live') return;
    if (lastHeartbeat && Date.now() - lastHeartbeat > 30000) {
      state.connection = 'stale';
      renderConnection();
    }
  }

  // ---------- Mock / simulated stream ----------
  function startMock() {
    if (mockRunning) return;
    mockRunning = true;
    state.connection = 'mock';
    renderConnection();

    state.session.startedAt = Date.now() - 4 * 60 * 1000; // start as if 4 min in
    state.teams.forEach(t => { t.status = 'running'; });

    // Pre-seed a few laps so the page is interesting on load
    setTimeout(() => simulateLap('mavericks', 8342 + Math.random() * 200), 600);
    setTimeout(() => simulateLap('mavericks', 8512 + Math.random() * 200), 1200);
    setTimeout(() => simulateLap('skibidi',   8881 + Math.random() * 300), 1800);
    setTimeout(() => simulateLap('orion',     9412 + Math.random() * 400), 2400);
    setTimeout(() => simulateLap('apex5',     9621 + Math.random() * 400), 3000);
    setTimeout(() => simulateLap('forceblr', 10124 + Math.random() * 600), 3600);

    function tick() {
      const pool = Array.from(state.teams.values()).filter(t =>
        t.status !== 'dnf' && t.currentLap < t.totalLaps
      );
      if (!pool.length) {
        // All done — restart everyone after 5s
        setTimeout(() => {
          state.teams.forEach(t => {
            t.attempt += 1;
            t.currentLap = 0;
            t.fastestLapMs = null;
            t.averageLapMs = null;
            t.lapTimes = [];
            t.status = 'running';
            applyAttemptStarted({ type: 'attempt_started', teamId: t.id, attempt: t.attempt, at: Date.now() });
          });
        }, 5000);
      } else {
        const team = pool[Math.floor(Math.random() * pool.length)];
        const base = team.fastestLapMs || (8500 + Math.random() * 2000);
        const variance = (Math.random() - 0.4) * 700;
        const lapTime = Math.max(7800, Math.round(base + variance));
        simulateLap(team.id, lapTime);
      }
      mockTimer = setTimeout(tick, 2500 + Math.random() * 2500);
    }
    mockTimer = setTimeout(tick, 4500);
  }

  function stopMock() {
    mockRunning = false;
    if (mockTimer) { clearTimeout(mockTimer); mockTimer = null; }
  }

  function simulateLap(teamId, lapTimeMs) {
    const team = state.teams.get(teamId);
    if (!team) return;
    if (team.currentLap >= team.totalLaps) return;
    team.lapTimes.push(lapTimeMs);
    const newLap = team.currentLap + 1;
    const fastest = Math.min(lapTimeMs, team.fastestLapMs ?? Infinity);
    const avg = Math.round(team.lapTimes.reduce((a, b) => a + b, 0) / team.lapTimes.length);
    const isPB = fastest === lapTimeMs;
    const isSB = state.session.bestLapMs == null || lapTimeMs < state.session.bestLapMs;
    dispatch({
      type: 'lap_completed',
      teamId,
      lap: newLap,
      lapTimeMs,
      fastestLapMs: fastest,
      averageLapMs: avg,
      sessionBestMs: isSB ? lapTimeMs : state.session.bestLapMs,
      isPersonalBest: isPB,
      isSessionBest: isSB,
      at: Date.now()
    });
  }

  // ---------- Boot ----------
  function boot() {
    render();
    setInterval(renderClock, 1000);
    staleTimer = setInterval(checkStale, 5000);
    connect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
