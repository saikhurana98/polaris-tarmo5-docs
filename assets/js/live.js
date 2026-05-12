/* ============================================================
   POLARIS GP — Live Telemetry Client
   ============================================================

   The /live/ page has three modes:

     standings — no active session. Shows the most recent canonical
                 standings (CANONICAL_STANDINGS below). The default
                 state any time no telemetry has flowed for the past
                 STALE_TELEMETRY_MS.

     live      — telemetry IS flowing AND the most recent
                 session_state carried { session.kind: "official" }.
                 This is treated as the official scheduled run;
                 results update the leaderboard.

     test      — telemetry IS flowing but session.kind is "test"
                 (or absent — we default to test for safety). Times
                 are clearly badged "unofficial" and do NOT update
                 the canonical standings.

   To update for a future event:
     1. Edit SCHEDULED_SESSION below (the one upcoming official run).
     2. After the run ends, edit CANONICAL_STANDINGS to the new
        results.

   ============================================================
   WIRE PROTOCOL — WebSocket, JSON, server → client.
   Connect: wss://<host>/?token=<token>

   Six message types (full schema in server/README.md):
     session_state | lap_completed | attempt_started |
     team_status   | session_ended | heartbeat
   ============================================================ */

(function() {
  'use strict';

  // ---------- Configuration — edit per event ----------

  // The next (or only) official scheduled session for the season.
  const SCHEDULED_SESSION = {
    name: 'Final',
    start: new Date('2026-05-13T16:00:00+05:30'),  // Wed May 13, 4:00 PM IST
    end:   new Date('2026-05-13T18:00:00+05:30'),  // Wed May 13, 6:00 PM IST
    windowLabel: '4:00 — 6:00 PM IST',
    dateLabel:   'Wed · May 13'
  };

  // The current authoritative standings. Shown whenever the page is
  // idle (no live session). Replace after each official session ends.
  // Today: Semi Finals (May 11) — note that this was a dress rehearsal,
  // but it's the most recent on-track data so it's what we show.
  const CANONICAL_STANDINGS = {
    sourceLabel: 'Semi Finals · May 11',
    sourceNote: 'Practice run · final standings update after Wed',
    teams: [
      { id: 'mavericks',         finalTimeMs: 43182, status: 'completed', note: 'Fastest of the session' },
      { id: 'skibidi',           finalTimeMs: 46943, status: 'completed', note: 'Five clean laps' },
      { id: 'orion',             finalTimeMs: null,  status: 'dnf',       note: null },
      { id: 'apex5',             finalTimeMs: null,  status: 'dnf',       note: null },
      { id: 'theonepieceisreal', finalTimeMs: null,  status: 'dnf',       note: null },
      { id: 'forceblr',          finalTimeMs: null,  status: 'dnf',       note: null }
    ]
  };

  // ---------- Static team registry ----------

  const TEAMS = [
    { id: 'mavericks',         car: 1,  name: 'Mavericks' },
    { id: 'skibidi',           car: 2,  name: 'Skibidi' },
    { id: 'orion',             car: 3,  name: 'Orion' },
    { id: 'apex5',             car: 5,  name: 'Apex 5' },
    { id: 'theonepieceisreal', car: 11, name: 'TheOnePieceIsReal' },
    { id: 'forceblr',          car: 14, name: 'ForceBLR' }
  ];

  const TOTAL_LAPS = 5;
  const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;     // 2h
  const STALE_TELEMETRY_MS = 60 * 1000;               // 60s no messages at all → relay dead → standings
  const ENDED_LINGER_MS = 10 * 60 * 1000;             // 10min idle after session_ended → drift back to standings
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- State ----------

  const state = {
    mode: 'standings',          // 'standings' | 'test' | 'live' | 'ended'
    firstTelemetryAt: null,
    lastTelemetryAt: null,      // any message including heartbeat — tracks connection liveness
    lastEventAt: null,          // real event (excludes heartbeat) — tracks session activity
    session: {
      name: SCHEDULED_SESSION.name,
      kind: 'test',             // 'official' | 'test' — set by sender via session_state
      startedAt: null,
      durationMs: SESSION_DURATION_MS,
      bestLapMs: null,
      bestLapTeam: null
    },
    teams: new Map(),
    connection: 'connecting'    // 'connecting' | 'connected' | 'offline'
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
      totalTimeMs: null,
      canonNote: null,
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
    header: document.querySelector('.live-header'),
    pulse: document.querySelector('.live-pulse'),
    stateLabel: document.getElementById('live-state-label'),
    sourceLabel: document.getElementById('live-source-label'),
    title: document.getElementById('live-title'),
    meta: document.getElementById('live-meta'),
    testBanner: document.getElementById('test-banner'),
    sectionEyebrow: document.getElementById('section-eyebrow'),
    sectionTitle: document.getElementById('section-title'),
    sectionLede: document.getElementById('section-lede'),
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
  function fmtCountdown(toMs) {
    const diff = toMs - Date.now();
    if (diff <= 0) return 'Starting…';
    const days = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `in ${days}d ${h}h`;
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }
  function fmtFeedTime(ms) {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  // ---------- Mode logic ----------

  function enterStandingsMode() {
    state.mode = 'standings';
    state.firstTelemetryAt = null;
    state.session.startedAt = null;
    state.session.bestLapMs = null;
    state.session.bestLapTeam = null;
    state.session.kind = 'test';
    seedCanonical();
    render();
    logEvent('MODE', 'Idle · showing current standings', 'evt-info');
  }

  function transitionFromIdle() {
    // First telemetry has arrived (or arrived again after a session_ended).
    // Initial mode is derived from whatever kind the session is currently
    // marked as — defaults to 'test' until session_state says otherwise.
    state.mode = state.session.kind === 'official' ? 'live' : 'test';
    state.firstTelemetryAt = Date.now();
    state.session.startedAt = Date.now();
    state.teams.forEach(t => {
      t.attempt = 1;
      t.currentLap = 0;
      t.fastestLapMs = null;
      t.averageLapMs = null;
      t.totalTimeMs = null;
      t.canonNote = null;
      t.lapTimes = [];
      t.status = 'idle';
    });
    state.session.bestLapMs = null;
    state.session.bestLapTeam = null;
    render();
    logEvent('MODE',
      state.mode === 'live'
        ? 'OFFICIAL session active'
        : 'TEST session active (unofficial — does not update leaderboard)',
      state.mode === 'live' ? 'evt-info' : 'evt-warn');
  }

  function syncModeToKind() {
    // Called after session.kind may have changed.
    if (state.mode === 'standings' || state.mode === 'ended') return;
    const target = state.session.kind === 'official' ? 'live' : 'test';
    if (target !== state.mode) {
      state.mode = target;
      logEvent('MODE',
        target === 'live' ? 'Re-classified as OFFICIAL' : 'Re-classified as TEST',
        target === 'live' ? 'evt-info' : 'evt-warn');
      render();
    }
  }

  function seedCanonical() {
    CANONICAL_STANDINGS.teams.forEach((canon, idx) => {
      const team = state.teams.get(canon.id);
      if (!team) return;
      team.attempt = 1;
      team.currentLap = canon.status === 'completed' ? TOTAL_LAPS : 0;
      team.fastestLapMs = null;
      team.averageLapMs = canon.finalTimeMs != null ? Math.round(canon.finalTimeMs / TOTAL_LAPS) : null;
      team.totalTimeMs = canon.finalTimeMs;
      team.canonNote = canon.note;
      team.lapTimes = [];
      team.status = canon.status;
      team.lastPosition = idx + 1;
    });
  }

  function maybeRevertOnStale() {
    if (state.mode === 'standings') return;
    // Relay dead → no messages at all for STALE_TELEMETRY_MS → revert.
    if (state.lastTelemetryAt && Date.now() - state.lastTelemetryAt > STALE_TELEMETRY_MS) {
      enterStandingsMode();
      return;
    }
    // Ended mode lingers while heartbeats flow, but eventually drift to standings
    // so visitors don't see "Final Result" stuck on the page indefinitely.
    if (state.mode === 'ended' && state.lastEventAt &&
        Date.now() - state.lastEventAt > ENDED_LINGER_MS) {
      enterStandingsMode();
    }
  }

  // ---------- Sort & rank ----------

  function rankedTeams() {
    const arr = Array.from(state.teams.values());
    if (state.mode === 'standings') {
      // Canonical sort: completed teams first (by totalTime asc), then DNFs.
      arr.sort((a, b) => {
        const aDone = a.status === 'completed';
        const bDone = b.status === 'completed';
        if (aDone && !bDone) return -1;
        if (bDone && !aDone) return 1;
        if (aDone && bDone) return (a.totalTimeMs ?? Infinity) - (b.totalTimeMs ?? Infinity);
        return a.car - b.car;
      });
      return arr;
    }
    arr.sort((a, b) => {
      if (a.status === 'dnf' && b.status !== 'dnf') return 1;
      if (b.status === 'dnf' && a.status !== 'dnf') return -1;
      const aHas = a.averageLapMs != null;
      const bHas = b.averageLapMs != null;
      if (aHas && !bHas) return -1;
      if (bHas && !aHas) return 1;
      if (aHas && bHas && a.averageLapMs !== b.averageLapMs) return a.averageLapMs - b.averageLapMs;
      if (a.currentLap !== b.currentLap) return b.currentLap - a.currentLap;
      return a.car - b.car;
    });
    return arr;
  }

  // ---------- Render ----------

  function setMetaCell(name, label, value) {
    const cell = document.querySelector(`.live-meta-cell[data-cell="${name}"]`);
    if (!cell) return;
    cell.querySelector('.live-meta-label').textContent = label;
    cell.querySelector('.live-meta-value').textContent = value;
  }

  function renderHeader() {
    if (els.header) els.header.setAttribute('data-mode', state.mode);
    if (els.testBanner) els.testBanner.hidden = state.mode !== 'test';
    if (!els.pulse) return;
    els.pulse.classList.remove('is-stale', 'is-dead');

    let stateLabel, sourceLabel, title;
    if (state.mode === 'standings') {
      stateLabel = 'STANDINGS';
      sourceLabel = CANONICAL_STANDINGS.sourceLabel;
      title = 'Current <em>Standings</em>';
      els.pulse.classList.add('is-dead');
    } else if (state.mode === 'test') {
      stateLabel = 'TEST SESSION';
      sourceLabel = 'Telemetry · Unofficial';
      title = 'Test <em>Session</em>';
      els.pulse.classList.add('is-stale');
    } else if (state.mode === 'live') {
      stateLabel = 'LIVE · OFFICIAL';
      sourceLabel = `Race Control · ${state.session.name}`;
      title = `${state.session.name} · <em>Live</em>`;
    } else if (state.mode === 'ended') {
      stateLabel = 'SESSION ENDED';
      sourceLabel = 'Final · Complete';
      title = 'Final <em>Result</em>';
      els.pulse.classList.add('is-dead');
    }

    if (els.stateLabel) els.stateLabel.textContent = stateLabel;
    if (els.sourceLabel) els.sourceLabel.textContent = sourceLabel;
    if (els.title) els.title.innerHTML = title;
  }

  function renderSectionCopy() {
    let eyebrow, title, lede;
    if (state.mode === 'standings') {
      eyebrow = 'Standings';
      title = 'Current <em>Standings</em>';
      lede = `From the most recent on-track session (<strong>${CANONICAL_STANDINGS.sourceLabel}</strong>). The next official run — <strong>${SCHEDULED_SESSION.name}, ${SCHEDULED_SESSION.dateLabel} · ${SCHEDULED_SESSION.windowLabel}</strong> — will replace these standings when complete.`;
    } else if (state.mode === 'test') {
      eyebrow = 'Test Session';
      title = 'Live <em>Pace</em> · Unofficial';
      lede = `Telemetry is flowing outside the scheduled ${SCHEDULED_SESSION.name} window. <strong>These times do not count</strong> — they're shown for practice and signal-check, and will not be added to the leaderboard. The official session is <strong>${SCHEDULED_SESSION.dateLabel} · ${SCHEDULED_SESSION.windowLabel}</strong>.`;
    } else if (state.mode === 'live') {
      eyebrow = 'Timing Tower';
      title = 'Order &amp; <em>Pace</em>';
      lede = `<strong>The Final · Live.</strong> Order updates each time a lap is set. <span class="t-flag t-flag--purple">P</span> = fastest of the session. <span class="t-flag t-flag--green">B</span> = personal best within an attempt. Gaps shown relative to current leader's average lap.`;
    } else {
      eyebrow = 'Final Result';
      title = 'After the <em>Final</em>';
      lede = `The session has ended. Final standings below.`;
    }
    if (els.sectionEyebrow) els.sectionEyebrow.textContent = eyebrow;
    if (els.sectionTitle) els.sectionTitle.innerHTML = title;
    if (els.sectionLede) els.sectionLede.innerHTML = lede;
  }

  function renderMeta() {
    if (state.mode === 'standings') {
      setMetaCell('primary', 'Source', CANONICAL_STANDINGS.sourceLabel);
      setMetaCell('time',    'Next Session', `${SCHEDULED_SESSION.dateLabel}, ${fmtCountdown(SCHEDULED_SESSION.start.getTime())}`);
      setMetaCell('window',  'Window', SCHEDULED_SESSION.windowLabel);
      const lead = CANONICAL_STANDINGS.teams.find(t => t.status === 'completed');
      setMetaCell('best',    'Top Time', lead ? fmtLap(lead.finalTimeMs) : '—');
    } else if (state.mode === 'test') {
      setMetaCell('primary', 'Session', 'Test · Unofficial');
      const elapsed = state.session.startedAt ? Date.now() - state.session.startedAt : 0;
      setMetaCell('time',    'Elapsed', fmtClock(elapsed));
      setMetaCell('window',  'Next Official', `${SCHEDULED_SESSION.dateLabel}, ${fmtCountdown(SCHEDULED_SESSION.start.getTime())}`);
      setMetaCell('best',    'Fastest (Test)', state.session.bestLapMs ? fmtLap(state.session.bestLapMs) : '—');
    } else if (state.mode === 'live') {
      setMetaCell('primary', 'Session', `${SCHEDULED_SESSION.name} · ${SCHEDULED_SESSION.dateLabel}`);
      const elapsed = state.session.startedAt ? Date.now() - state.session.startedAt : 0;
      setMetaCell('time',    'Elapsed', fmtClock(Math.min(elapsed, state.session.durationMs)));
      setMetaCell('window',  'Window', SCHEDULED_SESSION.windowLabel);
      setMetaCell('best',    'Fastest Lap', state.session.bestLapMs ? fmtLap(state.session.bestLapMs) : '—');
    } else if (state.mode === 'ended') {
      setMetaCell('primary', 'Result', `${SCHEDULED_SESSION.name} · Complete`);
      setMetaCell('time',    'Ended', SCHEDULED_SESSION.dateLabel);
      setMetaCell('window',  'Window', SCHEDULED_SESSION.windowLabel);
      setMetaCell('best',    'Fastest Lap', state.session.bestLapMs ? fmtLap(state.session.bestLapMs) : '—');
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
      void row.offsetHeight;
      row.style.transition = '';
      row.style.transform = '';
    });
  }

  function renderRows() {
    if (!tower) return;
    tower.classList.remove('mode-standings', 'mode-test', 'mode-live', 'mode-ended');
    tower.classList.add('mode-' + state.mode);

    const ranked = rankedTeams();
    const leader = ranked[0];
    const leaderAvg = leader && leader.averageLapMs != null ? leader.averageLapMs : null;
    const leaderTotal = leader && leader.totalTimeMs != null ? leader.totalTimeMs : null;

    ranked.forEach((team, idx) => {
      const pos = idx + 1;
      const row = rows.get(team.id);
      if (!row) return;
      row.style.order = String(pos);
      row.classList.toggle('is-leader', team.id === leader.id && team.status !== 'dnf' && (team.averageLapMs != null || team.totalTimeMs != null));
      row.classList.toggle('is-running', team.status === 'running');
      row.classList.toggle('is-dnf', team.status === 'dnf');

      const posNum = row.querySelector('.t-pos-num');
      if (posNum) posNum.textContent = String(pos);

      const delta = pos - team.lastPosition;
      const deltaEl = row.querySelector('.t-pos-delta');
      if (deltaEl) {
        deltaEl.classList.remove('t-pos-delta--up', 't-pos-delta--down', 't-pos-delta--same');
        if (state.mode === 'standings' || delta === 0) {
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

      const teamName = row.querySelector('.t-team-name');
      if (teamName) teamName.textContent = team.name;

      const teamNote = row.querySelector('.t-team-note');
      if (teamNote) {
        if (state.mode === 'standings') {
          teamNote.textContent = team.canonNote || (team.status === 'dnf' ? 'DNF in Semis' : '');
        } else if (team.status === 'dnf') {
          teamNote.textContent = 'DNF';
        } else if (team.status === 'completed') {
          teamNote.textContent = 'Run complete';
        } else if (team.status === 'running') {
          teamNote.textContent = `Attempt ${team.attempt} · Lap ${team.currentLap}/${team.totalLaps}`;
        } else {
          teamNote.textContent = 'Standing by';
        }
      }

      // lap pips
      const pips = row.querySelectorAll('.t-lap-pip');
      pips.forEach((pip, i) => {
        pip.classList.remove('filled', 'current');
        if (state.mode === 'standings') {
          if (team.status === 'completed') pip.classList.add('filled');
        } else {
          if (i + 1 < team.currentLap) pip.classList.add('filled');
          else if (i + 1 === team.currentLap && team.status === 'running') pip.classList.add('current');
          else if (i + 1 <= team.currentLap) pip.classList.add('filled');
        }
      });

      // labels + values vary by mode
      const labels = row.querySelectorAll('.t-cell-label');
      const fastestVal = row.querySelector('.t-fastest .t-cell-value');
      const avgVal = row.querySelector('.t-avg .t-cell-value');
      const gapVal = row.querySelector('.t-gap .t-cell-value');
      const attemptVal = row.querySelector('.t-attempt .t-cell-value');

      // Reset purple highlight
      if (fastestVal) fastestVal.classList.remove('t-cell-value--purple');

      if (state.mode === 'standings') {
        // Labels: Attempt → '—', Fastest → 'Total', Average → 'Avg/Lap', Gap → 'Status'
        labels.forEach(lbl => {
          const parent = lbl.parentElement;
          if (parent.classList.contains('t-attempt')) lbl.textContent = '—';
          else if (parent.classList.contains('t-fastest')) lbl.textContent = 'Total';
          else if (parent.classList.contains('t-avg')) lbl.textContent = 'Avg/Lap';
          else if (parent.classList.contains('t-gap')) lbl.textContent = 'Status';
        });
        if (attemptVal) attemptVal.textContent = '—';
        if (fastestVal) fastestVal.textContent = fmtLap(team.totalTimeMs);
        if (avgVal) avgVal.textContent = fmtLap(team.averageLapMs);
        if (gapVal) {
          if (team.status === 'dnf') {
            gapVal.textContent = 'DNF';
            gapVal.classList.add('t-cell-value--dim');
          } else if (team.id === leader.id) {
            gapVal.textContent = 'LEADER';
            gapVal.classList.remove('t-cell-value--dim');
          } else if (leaderTotal != null && team.totalTimeMs != null) {
            gapVal.textContent = fmtGap(team.totalTimeMs - leaderTotal);
            gapVal.classList.remove('t-cell-value--dim');
          } else {
            gapVal.textContent = '—';
            gapVal.classList.remove('t-cell-value--dim');
          }
        }
      } else {
        labels.forEach(lbl => {
          const parent = lbl.parentElement;
          if (parent.classList.contains('t-attempt')) lbl.textContent = 'Attempt';
          else if (parent.classList.contains('t-fastest')) lbl.textContent = 'Fastest';
          else if (parent.classList.contains('t-avg')) lbl.textContent = 'Average';
          else if (parent.classList.contains('t-gap')) lbl.textContent = 'Gap';
        });
        if (attemptVal) attemptVal.textContent = String(team.attempt);
        if (fastestVal) {
          fastestVal.textContent = fmtLap(team.fastestLapMs);
          fastestVal.classList.toggle('t-cell-value--purple',
            team.fastestLapMs != null && team.fastestLapMs === state.session.bestLapMs);
        }
        if (avgVal) avgVal.textContent = fmtLap(team.averageLapMs);
        if (gapVal) {
          gapVal.classList.remove('t-cell-value--dim');
          if (team.id === leader.id && team.averageLapMs != null) {
            gapVal.textContent = 'LEADER';
          } else if (leaderAvg != null && team.averageLapMs != null) {
            gapVal.textContent = fmtGap(team.averageLapMs - leaderAvg);
          } else {
            gapVal.textContent = '—';
          }
        }
      }

      team.lastPosition = pos;
    });
  }

  function renderPace() {
    const teams = Array.from(state.teams.values());
    let metric;
    if (state.mode === 'standings') {
      metric = t => t.totalTimeMs;
    } else {
      metric = t => t.averageLapMs;
    }
    const withMetric = teams.filter(t => metric(t) != null).map(metric);
    teams.forEach(team => {
      const row = paceRows.get(team.id);
      if (!row) return;
      const bar = row.querySelector('.pace-bar');
      const val = row.querySelector('.pace-value');
      if (!withMetric.length || metric(team) == null) {
        row.classList.remove('is-leader');
        if (bar) bar.style.width = '0%';
        if (val) val.textContent = team.status === 'dnf' ? 'DNF' : '—';
        return;
      }
      const min = Math.min(...withMetric);
      const max = Math.max(...withMetric);
      const range = Math.max(max - min, 1);
      const isLeader = metric(team) === min;
      row.classList.toggle('is-leader', isLeader);
      const pct = 30 + ((metric(team) - min) / range) * 70;
      if (bar) bar.style.width = `${pct}%`;
      if (val) val.textContent = fmtLap(metric(team));
    });
  }

  function render() {
    const oldRects = captureRects();
    renderHeader();
    renderSectionCopy();
    renderMeta();
    renderRows();
    playFlip(oldRects);
    renderPace();
  }

  function renderTick() {
    // Cheap per-second updates without re-running the full row render.
    renderMeta();
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
    while (els.feedLog.children.length > 30) {
      els.feedLog.removeChild(els.feedLog.lastChild);
    }
  }

  // ---------- Telemetry handlers ----------

  function onAnyTelemetry() {
    state.lastTelemetryAt = Date.now();
    state.lastEventAt = Date.now();
    if (state.mode === 'standings' || state.mode === 'ended') {
      transitionFromIdle();
    }
  }

  function applySessionState(msg) {
    // Apply kind FIRST so transitionFromIdle (via onAnyTelemetry) sees it.
    if (msg.session) {
      state.session.kind = msg.session.kind === 'official' ? 'official' : 'test';
    }
    onAnyTelemetry();
    if (msg.session) {
      Object.assign(state.session, {
        name: msg.session.name || state.session.name,
        startedAt: msg.session.startedAt || state.session.startedAt,
        durationMs: msg.session.durationMs || state.session.durationMs,
        bestLapMs: msg.session.bestLapMs ?? state.session.bestLapMs,
        bestLapTeam: msg.session.bestLapTeam ?? state.session.bestLapTeam
      });
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
    // If the snapshot says the session has already ended, honour it —
    // otherwise late viewers see LIVE forever after the Final closes.
    if (msg.session && msg.session.state === 'ended') {
      state.mode = 'ended';
    } else {
      syncModeToKind();
    }
    render();
  }

  function applyLapCompleted(msg) {
    onAnyTelemetry();
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
    onAnyTelemetry();
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
    onAnyTelemetry();
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
      state.mode = 'ended';
      state.lastTelemetryAt = Date.now();
      state.lastEventAt = Date.now();
      logEvent('END', 'Session ended · checkered flag', 'evt-info');
      render();
    } else if (msg.type === 'heartbeat') {
      // Connection liveness only — does NOT count as session activity,
      // so the ENDED → STANDINGS drift still fires even while heartbeats flow.
      state.lastTelemetryAt = Date.now();
    }
  }

  // ---------- WebSocket connection ----------

  let socket = null;
  let reconnectAttempt = 0;
  let reconnectTimer = null;

  function connect() {
    const url = (window.LIVE_CONFIG && window.LIVE_CONFIG.wsUrl) || '';
    const token = (window.LIVE_CONFIG && window.LIVE_CONFIG.wsToken) || '';
    if (!url) {
      logEvent('INFO', 'No WS endpoint configured — page will stay on standings until telemetry is wired', 'evt-info');
      return;
    }
    let connectUrl = url;
    if (token) {
      connectUrl += (url.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(token);
    }

    state.connection = 'connecting';
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
      state.connection = 'connected';
      logEvent('WS', 'Connected · awaiting telemetry', 'evt-info');
    });

    socket.addEventListener('message', (ev) => {
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
      state.connection = 'offline';
      scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectAttempt += 1;
    const wait = Math.min(30000, 1000 * Math.pow(2, Math.min(reconnectAttempt - 1, 5)));
    logEvent('WS', `Retry #${reconnectAttempt} in ${(wait / 1000).toFixed(0)}s`, 'evt-info');
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, wait);
  }

  // ---------- Boot ----------

  function boot() {
    seedCanonical();
    render();
    setInterval(renderTick, 1000);
    setInterval(maybeRevertOnStale, 5000);
    connect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
