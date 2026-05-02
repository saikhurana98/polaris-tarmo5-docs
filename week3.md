---
layout: default
title: "Week 3: Modifications"
permalink: /week3/
---

<div class="page-header">
  <h1>Week 3 — Modifications</h1>
  <div class="page-meta">
    <span class="meta-item">📅 May 4 – 8, 2026</span>
    <span class="meta-item">🏁 Official session: Thursday, 6 PM – 7 PM</span>
    <span class="meta-item">📍 Track: 2nd Floor</span>
    <span class="badge badge-active">Active</span>
  </div>
</div>

<div class="info-row">
  <div class="info-item">
    <div class="info-label">Focus</div>
    <div class="info-value">Modify Your Car</div>
  </div>
  <div class="info-item">
    <div class="info-label">Budget</div>
    <div class="info-value">₹1,000 / team</div>
  </div>
  <div class="info-item">
    <div class="info-label">Parts Order Deadline</div>
    <div class="info-value">Sunday EOD</div>
  </div>
</div>

---

## Week 2 Recap

<div class="callout callout-critical">
  <div class="callout-title">⚠ Week 2 Results</div>
  <p>Good progress — <strong>at least half the teams</strong> completed their cars and got through a significant chunk of their laps. But not everyone is there yet.</p>
  <p>If your team is still behind: <strong>this is your warning.</strong> The gap is growing. Start catching up now.</p>
</div>

The competition is separating into teams that execute and teams that don't. Which side you're on is entirely up to you.

---

## This Week's Challenge

This week is about **making your car better**. You've built it. You've (hopefully) driven it. Now identify what's failing and fix it — creatively.

Every team has issues. Steering too loose. Drivetrain binding. Wheels losing grip. Chassis flexing. This is the week to address all of it. Don't just replace broken parts with the same broken design — **redesign them**.

---

## Modification Budget

<div class="card-grid">
  <div class="card-sm">
    <h4>₹1,000 Per Team</h4>
    <p>Each team has a budget of ₹1,000 INR for upgrades and replacement parts this week.</p>
  </div>
  <div class="card-sm">
    <h4>Parts Deadline: Sunday EOD</h4>
    <p>Submit your parts links by end of day Sunday. Orders will be placed Monday, parts delivered by Tuesday morning.</p>
  </div>
</div>

### How to Order Parts

<ol class="rules">
  <li>Identify what you need — replacement components, upgraded electronics, better hardware, etc.</li>
  <li>Find the part on one of the <strong>3 approved vendors</strong> listed below.</li>
  <li>Send the <strong>product link</strong> to the organising team before <strong>end of day Sunday</strong>.</li>
  <li>Stay within your <strong>₹1,000 budget</strong>. Anything over budget will not be ordered.</li>
  <li>Parts will be ordered Monday and delivered to you by <strong>Tuesday morning</strong>.</li>
</ol>

### Approved Vendors

<ul class="resource-list">
  <li><a href="https://www.sharvielectronics.com/"><span class="resource-icon">🛒</span> Sharvi Electronics <span class="resource-tag">Vendor</span></a></li>
  <li><a href="https://www.probots.co.in/"><span class="resource-icon">🛒</span> Probots India <span class="resource-tag">Vendor</span></a></li>
  <li><a href="https://robocraze.com/"><span class="resource-icon">🛒</span> Robocraze <span class="resource-tag">Vendor</span></a></li>
</ul>

Only links from these three vendors will be accepted. No exceptions.

---

## Upgrade Rules

<div class="callout callout-critical">
  <div class="callout-title">⚠ Read This Carefully</div>
  <p>Any and every upgrade is legal — as long as you follow these two rules:</p>
  <ol>
    <li><strong>Parts must come from the kit or this week's budget.</strong> You may only use parts that were supplied in your original kit or purchased using the ₹1,000 budget. Personally sponsored upgrades are <strong>not allowed</strong>.</li>
    <li><strong>1 KG limit on 3D-printed parts</strong> (any material). Each team has a total allowance of 1 KG of 3D-printed parts. Plan accordingly.</li>
  </ol>
</div>

### 3D Printing Process

Prints will happen in batches:
- **1 overnight batch**
- **1 morning batch**
- **Bonus batches** if the printer is available

To request a print, you must submit:
- The **STL or STEP file** (not a verbal description)
- Your chosen **print parameters**: wall loops, top/bottom fill layers, infill pattern and density, print orientation, and support settings

<div class="callout callout-critical">
  <div class="callout-title">⚠ No More Vague Print Requests</div>
  <p>Asking Kushal or Yatin to "print a pinion gear in PETG" is <strong>no longer a valid request</strong>. Every team is responsible for selecting the correct file and specifying their own print parameters.</p>
  <p>If you don't know how to set print parameters, there are plenty of resources online. This is your responsibility — learn it.</p>
</div>

---

## The Free Upgrade — EdgeTX Tuning

Before you spend a single rupee, look at your controller. Most of your comfort and control with the car is hidden deep inside **EdgeTX**. These are free upgrades that can transform how your car drives.

<div class="tip-grid">
  <div class="tip"><span class="tip-icon">✓</span> <strong>Throttle curve:</strong> You don't need linear throttle. Apply an exponential curve so low-throttle inputs give you finer control, and full throttle is still available when you need it.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Steering input curve:</strong> Same idea — reduce sensitivity around centre for smoother steering, while keeping full lock available at the extremes.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Steering-throttle mix:</strong> Apply a steering input modifier based on throttle position. At high speed, reduce your steering travel automatically to prevent snap oversteer.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Sensitivity tuning:</strong> Given the track width and car size, your default input range is probably too aggressive. Narrow it to a comfortable window. Small adjustments here make a massive difference.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Dual rates / flight modes:</strong> Set up multiple driving profiles — one for practice (lower sensitivity) and one for timed runs. EdgeTX can switch between them with a toggle.</div>
</div>

EdgeTX can do basically anything you can imagine. These are the easiest wins you'll get this week — and they cost nothing.

---

## CAD &amp; Design — Fusion 360 x Claude

This week, Anthropic released their **native integration for Fusion 360**. If you're redesigning parts, this is the perfect time to get hands-on with parametric CAD.

Whether you're modifying a steering knuckle for better clearance, designing a reinforced bumper mount, or rethinking your wheel hub geometry — use Fusion 360 with Claude to iterate faster. The Onshape model is still available as reference, but Fusion 360 gives you a powerful alternative for custom modifications.

<div class="tip-grid">
  <div class="tip"><span class="tip-icon">✓</span> <strong>Don't just replace — redesign.</strong> If a part keeps breaking, the geometry is wrong. Thicken walls, add fillets, change the print orientation. A direct reprint of a failed part will fail again.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Use Fusion 360 + Claude.</strong> Anthropic's native Fusion 360 integration just dropped. Use it to sketch, model, and iterate on modifications faster than manual CAD work.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Test fit before committing.</strong> Print a test piece before printing the final version. Tolerances matter — especially on joints and mounting points.</div>
</div>

---

## What You Should Focus On

<div class="tip-grid">
  <div class="tip"><span class="tip-icon">✓</span> <strong>Diagnose your failures:</strong> What specifically caused your DNF or slow laps last week? Steering? Grip? Electronics? Be precise about the problem before jumping to a solution.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Get creative:</strong> The best modifications aren't always the obvious ones. Think about weight distribution, centre of gravity, tyre compound, suspension geometry. This is where engineering wins.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Keep practicing:</strong> The 2nd floor track is open at all times. Test every modification on the actual track before Thursday.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Print spares:</strong> If you designed a new part, print at least one backup. You already learned this the hard way.</div>
  <div class="tip"><span class="tip-icon">✓</span> <strong>Budget wisely:</strong> ₹1,000 is not a lot. Prioritise the one upgrade that will make the biggest difference to your lap time or reliability.</div>
</div>

<div class="callout callout-critical">
  <div class="callout-title">⚠ Reminder: Controller Profiles</div>
  <p>Controllers are still <strong>shared equipment</strong>. Back up your EdgeTX profile before and after every session. Double-verify your settings before your run.</p>
  <p><strong>Rivals, not enemies.</strong></p>
</div>

---

## Key Dates

<div class="info-row">
  <div class="info-item">
    <div class="info-label">Parts Order Deadline</div>
    <div class="info-value">Sunday EOD</div>
  </div>
  <div class="info-item">
    <div class="info-label">Parts Delivered</div>
    <div class="info-value">Tuesday AM</div>
  </div>
  <div class="info-item">
    <div class="info-label">Official Session</div>
    <div class="info-value">Thu, 6–7 PM</div>
  </div>
</div>

---

## Build Checklist

<ul class="checklist">
  <li><span class="check-box"></span> Identified key failure points from Weeks 1 &amp; 2</li>
  <li><span class="check-box"></span> EdgeTX tuned — throttle curve, steering curve, sensitivity</li>
  <li><span class="check-box"></span> Designed modifications in CAD (Fusion 360 or Onshape)</li>
  <li><span class="check-box"></span> Parts links submitted to organisers (Sunday EOD)</li>
  <li><span class="check-box"></span> 3D print requests submitted with STL/STEP + print parameters</li>
  <li><span class="check-box"></span> Modified parts printed, test-fitted, within 1 KG limit</li>
  <li><span class="check-box"></span> Spare parts printed for all modified components</li>
  <li><span class="check-box"></span> Ordered parts received and installed (Tuesday)</li>
  <li><span class="check-box"></span> Practice laps completed on 2nd floor track with modifications</li>
  <li><span class="check-box"></span> EdgeTX profile backed up and verified</li>
  <li><span class="check-box"></span> Battery fully charged before session</li>
  <li class="final"><span class="check-box"></span> <strong>3 timed laps completed during official session</strong></li>
</ul>

---

## Official Session — Thursday, 6 PM – 7 PM

<div class="info-row">
  <div class="info-item">
    <div class="info-label">Session Window</div>
    <div class="info-value">6 PM – 7 PM</div>
  </div>
  <div class="info-item">
    <div class="info-label">Location</div>
    <div class="info-value">2nd Floor Track</div>
  </div>
  <div class="info-item">
    <div class="info-label">Duration</div>
    <div class="info-value">1 Hour</div>
  </div>
</div>

All laps must be set **within the 1-hour session window**. Same rules as Week 2.

<ol class="rules">
  <li>The official session runs from <strong>6:00 PM to 7:00 PM</strong> sharp.</li>
  <li>Teams rotate through attempts. Multiple runs allowed within the hour.</li>
  <li>The car must complete <strong>3 laps in succession</strong> without stopping or being touched.</li>
  <li>Each lap is <strong>individually timed</strong>. Your best session is recorded.</li>
  <li>The out lap does not count.</li>
  <li>If the car leaves the track, that attempt is void — retry if time permits.</li>
  <li>Points rubric remains in effect. Failing to complete laps = points lost.</li>
</ol>
