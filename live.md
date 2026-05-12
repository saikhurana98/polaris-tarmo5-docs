---
layout: default
title: "Active Session"
permalink: /live/
description: "Live telemetry from the Polaris GP race track — lap-by-lap timing, fastest laps, and live position updates."
---

<div class="live-header">
  <div class="container">
    <div class="live-eyebrow">
      <span class="live-pulse" aria-hidden="true"></span>
      <span class="live-label" id="live-state-label">Connecting…</span>
      <span class="live-source" id="live-source-label">Awaiting telemetry</span>
    </div>
    <h1 class="live-title">Active <em>Session</em></h1>
    <div class="live-meta">
      <div class="live-meta-cell">
        <span class="live-meta-label">Session</span>
        <span class="live-meta-value" id="session-name">Final · Wed May 13</span>
      </div>
      <div class="live-meta-cell">
        <span class="live-meta-label">Elapsed</span>
        <span class="live-meta-value mono" id="session-clock">00:00:00</span>
      </div>
      <div class="live-meta-cell">
        <span class="live-meta-label">Window</span>
        <span class="live-meta-value">4:00 — 6:00 PM</span>
      </div>
      <div class="live-meta-cell">
        <span class="live-meta-label">Fastest Lap</span>
        <span class="live-meta-value mono" id="session-best">—</span>
      </div>
    </div>
  </div>
</div>

<section class="section">
  <div class="container">
    <div class="section-eyebrow">Timing Tower</div>
    <h2 class="section-title">Order &amp; <em>Pace</em></h2>
    <p class="section-lede">Order updates each time a lap is set. <span class="t-flag t-flag--purple">P</span> = fastest of the session. <span class="t-flag t-flag--green">B</span> = personal best within an attempt. Gaps shown relative to current leader's average lap.</p>

    <div class="timing-tower" id="timing-tower">

      <div class="timing-row" data-team="mavericks" style="order:1;">
        <div class="t-pos">
          <span class="t-pos-num">1</span>
          <span class="t-pos-delta t-pos-delta--same" aria-hidden="true">—</span>
        </div>
        <div class="t-car"><span class="t-car-num">01</span></div>
        <div class="t-team">
          <div class="t-team-name">Mavericks</div>
          <div class="t-team-note">Setting pace</div>
        </div>
        <div class="t-laps" data-lap="0" data-total="5">
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
        </div>
        <div class="t-attempt">
          <span class="t-cell-label">Attempt</span>
          <span class="t-cell-value mono">1</span>
        </div>
        <div class="t-fastest">
          <span class="t-cell-label">Fastest</span>
          <span class="t-cell-value mono" data-field="fastest">—</span>
        </div>
        <div class="t-avg">
          <span class="t-cell-label">Average</span>
          <span class="t-cell-value mono" data-field="avg">—</span>
        </div>
        <div class="t-gap">
          <span class="t-cell-label">Gap</span>
          <span class="t-cell-value mono" data-field="gap">—</span>
        </div>
      </div>

      <div class="timing-row" data-team="skibidi" style="order:2;">
        <div class="t-pos">
          <span class="t-pos-num">2</span>
          <span class="t-pos-delta t-pos-delta--same" aria-hidden="true">—</span>
        </div>
        <div class="t-car"><span class="t-car-num">02</span></div>
        <div class="t-team">
          <div class="t-team-name">Skibidi</div>
          <div class="t-team-note">Five clean laps in Semis</div>
        </div>
        <div class="t-laps" data-lap="0" data-total="5">
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
        </div>
        <div class="t-attempt">
          <span class="t-cell-label">Attempt</span>
          <span class="t-cell-value mono">1</span>
        </div>
        <div class="t-fastest">
          <span class="t-cell-label">Fastest</span>
          <span class="t-cell-value mono" data-field="fastest">—</span>
        </div>
        <div class="t-avg">
          <span class="t-cell-label">Average</span>
          <span class="t-cell-value mono" data-field="avg">—</span>
        </div>
        <div class="t-gap">
          <span class="t-cell-label">Gap</span>
          <span class="t-cell-value mono" data-field="gap">—</span>
        </div>
      </div>

      <div class="timing-row" data-team="orion" style="order:3;">
        <div class="t-pos">
          <span class="t-pos-num">3</span>
          <span class="t-pos-delta t-pos-delta--same" aria-hidden="true">—</span>
        </div>
        <div class="t-car"><span class="t-car-num">03</span></div>
        <div class="t-team">
          <div class="t-team-name">Orion</div>
          <div class="t-team-note">Rebuilding after Semis</div>
        </div>
        <div class="t-laps" data-lap="0" data-total="5">
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
        </div>
        <div class="t-attempt">
          <span class="t-cell-label">Attempt</span>
          <span class="t-cell-value mono">1</span>
        </div>
        <div class="t-fastest">
          <span class="t-cell-label">Fastest</span>
          <span class="t-cell-value mono" data-field="fastest">—</span>
        </div>
        <div class="t-avg">
          <span class="t-cell-label">Average</span>
          <span class="t-cell-value mono" data-field="avg">—</span>
        </div>
        <div class="t-gap">
          <span class="t-cell-label">Gap</span>
          <span class="t-cell-value mono" data-field="gap">—</span>
        </div>
      </div>

      <div class="timing-row" data-team="apex5" style="order:4;">
        <div class="t-pos">
          <span class="t-pos-num">4</span>
          <span class="t-pos-delta t-pos-delta--same" aria-hidden="true">—</span>
        </div>
        <div class="t-car"><span class="t-car-num">05</span></div>
        <div class="t-team">
          <div class="t-team-name">Apex 5</div>
          <div class="t-team-note">Five drivers, one car</div>
        </div>
        <div class="t-laps" data-lap="0" data-total="5">
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
        </div>
        <div class="t-attempt">
          <span class="t-cell-label">Attempt</span>
          <span class="t-cell-value mono">1</span>
        </div>
        <div class="t-fastest">
          <span class="t-cell-label">Fastest</span>
          <span class="t-cell-value mono" data-field="fastest">—</span>
        </div>
        <div class="t-avg">
          <span class="t-cell-label">Average</span>
          <span class="t-cell-value mono" data-field="avg">—</span>
        </div>
        <div class="t-gap">
          <span class="t-cell-label">Gap</span>
          <span class="t-cell-value mono" data-field="gap">—</span>
        </div>
      </div>

      <div class="timing-row" data-team="theonepieceisreal" style="order:5;">
        <div class="t-pos">
          <span class="t-pos-num">5</span>
          <span class="t-pos-delta t-pos-delta--same" aria-hidden="true">—</span>
        </div>
        <div class="t-car"><span class="t-car-num">11</span></div>
        <div class="t-team">
          <div class="t-team-name">TheOnePieceIsReal</div>
          <div class="t-team-note">Hunting first finish</div>
        </div>
        <div class="t-laps" data-lap="0" data-total="5">
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
        </div>
        <div class="t-attempt">
          <span class="t-cell-label">Attempt</span>
          <span class="t-cell-value mono">1</span>
        </div>
        <div class="t-fastest">
          <span class="t-cell-label">Fastest</span>
          <span class="t-cell-value mono" data-field="fastest">—</span>
        </div>
        <div class="t-avg">
          <span class="t-cell-label">Average</span>
          <span class="t-cell-value mono" data-field="avg">—</span>
        </div>
        <div class="t-gap">
          <span class="t-cell-label">Gap</span>
          <span class="t-cell-value mono" data-field="gap">—</span>
        </div>
      </div>

      <div class="timing-row" data-team="forceblr" style="order:6;">
        <div class="t-pos">
          <span class="t-pos-num">6</span>
          <span class="t-pos-delta t-pos-delta--same" aria-hidden="true">—</span>
        </div>
        <div class="t-car"><span class="t-car-num">14</span></div>
        <div class="t-team">
          <div class="t-team-name">ForceBLR</div>
          <div class="t-team-note">All in on the Final</div>
        </div>
        <div class="t-laps" data-lap="0" data-total="5">
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
          <span class="t-lap-pip"></span>
        </div>
        <div class="t-attempt">
          <span class="t-cell-label">Attempt</span>
          <span class="t-cell-value mono">1</span>
        </div>
        <div class="t-fastest">
          <span class="t-cell-label">Fastest</span>
          <span class="t-cell-value mono" data-field="fastest">—</span>
        </div>
        <div class="t-avg">
          <span class="t-cell-label">Average</span>
          <span class="t-cell-value mono" data-field="avg">—</span>
        </div>
        <div class="t-gap">
          <span class="t-cell-label">Gap</span>
          <span class="t-cell-value mono" data-field="gap">—</span>
        </div>
      </div>

    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-eyebrow">Pace Compare</div>
    <h2 class="section-title">Average Lap <em>Distribution</em></h2>
    <p class="section-lede">Every team's running average on the same axis. Shorter bars = faster pace. Bars animate as new laps come in.</p>
    <div class="pace-compare" id="pace-compare">
      <div class="pace-row" data-team="mavericks">
        <span class="pace-name">Mavericks</span>
        <div class="pace-track"><span class="pace-bar" style="width:0%"></span></div>
        <span class="pace-value mono">—</span>
      </div>
      <div class="pace-row" data-team="skibidi">
        <span class="pace-name">Skibidi</span>
        <div class="pace-track"><span class="pace-bar" style="width:0%"></span></div>
        <span class="pace-value mono">—</span>
      </div>
      <div class="pace-row" data-team="orion">
        <span class="pace-name">Orion</span>
        <div class="pace-track"><span class="pace-bar" style="width:0%"></span></div>
        <span class="pace-value mono">—</span>
      </div>
      <div class="pace-row" data-team="apex5">
        <span class="pace-name">Apex 5</span>
        <div class="pace-track"><span class="pace-bar" style="width:0%"></span></div>
        <span class="pace-value mono">—</span>
      </div>
      <div class="pace-row" data-team="theonepieceisreal">
        <span class="pace-name">TheOnePieceIsReal</span>
        <div class="pace-track"><span class="pace-bar" style="width:0%"></span></div>
        <span class="pace-value mono">—</span>
      </div>
      <div class="pace-row" data-team="forceblr">
        <span class="pace-name">ForceBLR</span>
        <div class="pace-track"><span class="pace-bar" style="width:0%"></span></div>
        <span class="pace-value mono">—</span>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-eyebrow">Stream Status</div>
    <h2 class="section-title">Telemetry <em>Feed</em></h2>
    <p class="section-lede">This page reads a WebSocket feed from the local race-control app. If the connection drops, the page shows the last known state and tries to reconnect. If no live feed is available, a simulated stream takes over so the layout stays meaningful.</p>
    <div class="feed-log" id="feed-log" aria-live="polite"></div>
  </div>
</section>

<script>
  window.LIVE_CONFIG = {
    wsUrl: {% if site.data.live.ws_url %}{{ site.data.live.ws_url | jsonify }}{% else %}""{% endif %},
    wsToken: {% if site.data.live.ws_token %}{{ site.data.live.ws_token | jsonify }}{% else %}""{% endif %}
  };
</script>
<script src="{{ '/assets/js/live.js' | relative_url }}" defer></script>
