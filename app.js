/**
 * ============================================================
 * SPIDTES BY OKELAH™ — app.js
 * Sprint 2: Fake-Out Animation Engine
 *
 * Architecture:
 *  - STATE object tracks scan lifecycle
 *  - runFakeOutSequence() drives a chained setTimeout timing engine
 *  - Each phase fn adds/removes CSS classes defined in style.css
 *  - No real API calls in Sprint 2. Placeholder values used.
 * ============================================================
 */

'use strict';

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const DOM = {
  // Header
  body:            document.body,

  // Speedometer
  goBtn:           document.getElementById('go-btn'),
  needleGroup:     document.getElementById('gauge-needle-group'),
  gaugeFill:       document.getElementById('gauge-fill'),
  speedValue:      document.getElementById('speed-value'),
  pingValue:       document.getElementById('ping-value'),
  statusBlock:     document.getElementById('status-block'),
  speedometerWrap: document.querySelector('.speedometer-wrap'),
  speedometerSect: document.querySelector('.speedometer-section'),

  // Results row
  resultsRow:      document.getElementById('results-row'),
  resultDlVal:     document.getElementById('result-download-val'),
  resultPingVal:   document.getElementById('result-ping-val'),
  resultGradeVal:  document.getElementById('result-grade-val'),

  // Roast container
  roastContainer:  document.getElementById('roast-container'),

  // Receipt
  receiptStage:    document.getElementById('receipt-stage'),
  receiptSpeedVal: document.getElementById('receipt-speed-val'),
  receiptPingVal:  document.getElementById('receipt-ping-val'),
  receiptGradeVal: document.getElementById('receipt-grade-val'),
  receiptTimestamp:document.getElementById('receipt-timestamp'),
  receiptIsp:      document.getElementById('receipt-isp'),
  receiptLocation: document.getElementById('receipt-location'),
  receiptIp:       document.getElementById('receipt-ip'),
  receiptLatency:  document.getElementById('receipt-latency'),
  receiptConn:     document.getElementById('receipt-connection'),
  receiptVpn:      document.getElementById('receipt-vpn'),
  receiptRoast:    document.getElementById('receipt-roast-text'),
};


/* ============================================================
   STATE
   ============================================================ */
const STATE = {
  isScanning: false,
  scanCount:  0,       // Used in Sprint 3 for escalating roasts
  timers:     [],      // Held for potential cleanup
};

/**
 * Needle rotation constants (CSS SVG transform, origin at centre).
 * 240deg = 0 Mbps (lower-left, 8 o'clock)
 * 120deg = 100 Mbps (lower-right, 4 o'clock)
 * Range = 120 deg clockwise from start.
 *
 * Formula: deg = 240 + (speed / 100) * (480 - 240)
 *          = 240 + speed * 2.4
 */
const NEEDLE = {
  start:  240,  // degrees at 0 Mbps
  end:    480,  // degrees at 100 Mbps (= 120 + full rotation alias)
  range:  240,  // total sweep
  mbpsToRot: (mbps) => 240 + (mbps / 100) * 240,
};

/** Total arc length of the gauge path (≈ 524px at viewBox scale) */
const ARC_LENGTH = 524;


/* ============================================================
   UTILITIES
   ============================================================ */

/** Set needle rotation by inserting inline style transform */
function setNeedle(deg) {
  DOM.needleGroup.style.transform = `rotate(${deg}deg)`;
}

/** Set gauge fill arc (0–100 Mbps) */
function setGaugeFill(mbps) {
  const filled = (mbps / 100) * ARC_LENGTH;
  DOM.gaugeFill.setAttribute('stroke-dasharray', `${filled} ${ARC_LENGTH}`);
}

/** Animate the speed counter from current to target value */
function animateCounter(fromVal, toVal, durationMs, onUpdate, onDone) {
  const startTime = performance.now();
  const diff = toVal - fromVal;

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(fromVal + diff * eased);
    onUpdate(current);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(tick);
}

/** Schedule a setTimeout and register it for cleanup */
function schedule(fn, delay) {
  const id = setTimeout(fn, delay);
  STATE.timers.push(id);
  return id;
}

/** Clear all pending timers */
function clearAllTimers() {
  STATE.timers.forEach(clearTimeout);
  STATE.timers = [];
}

/** Format timestamp for receipt: "14:22 · 08 May 2026" */
function formatTimestamp() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = String(now.getDate()).padStart(2, '0');
  const mon = months[now.getMonth()];
  const yyyy = now.getFullYear();
  return `${hh}:${mm} · ${dd} ${mon} ${yyyy}`;
}

/** Inject scanning dots into GO button (cosmetic) */
function injectScanningDots() {
  if (document.getElementById('scanning-dots')) return;
  const dots = document.createElement('span');
  dots.className = 'go-scanning-dots';
  dots.id = 'scanning-dots';
  dots.innerHTML = '<span></span><span></span><span></span>';
  DOM.goBtn.appendChild(dots);
}

/** Remove scanning dots from GO button */
function removeScanningDots() {
  const dots = document.getElementById('scanning-dots');
  if (dots) dots.remove();
}

/** Flash a full-screen red overlay element */
function flashCrashOverlay() {
  const el = document.createElement('div');
  el.className = 'crash-flash';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}


/* ============================================================
   FAKE-OUT SEQUENCE  (4-second timing engine)
   ============================================================
   t=0      phase1_rev()      — needle revs to ~80 Mbps
   t=1400   phase2_stutter()  — needle shakes/stutters
   t=2200   phase3_crash()    — needle slams to 0, flash red
   t=2800   phase4_broken()   — gauge "cracks", ominous pause
   t=4000   phase5_reveal()   — hide speedometer, show receipt
   ============================================================ */

function runFakeOutSequence() {
  schedule(phase1_rev,     0);
  schedule(phase2_stutter, 1400);
  schedule(phase3_crash,   2200);
  schedule(phase4_broken,  2800);
  schedule(phase5_reveal,  4000);
}

/* ── Phase 1: Rev ── */
function phase1_rev() {
  const TARGET_MBPS = 82;
  const TARGET_ROT  = NEEDLE.mbpsToRot(TARGET_MBPS); // ≈ 437 deg

  // Add revving class (smooth transition), then set rotation
  DOM.needleGroup.classList.add('needle--revving');
  setNeedle(TARGET_ROT);
  setGaugeFill(TARGET_MBPS);

  // Count speed value up
  animateCounter(0, TARGET_MBPS, 1200, (v) => {
    DOM.speedValue.textContent = v;
    DOM.pingValue.textContent  = `${Math.max(8, Math.round(80 - v * 0.8))} ms`;
  });

  updateStatus('Scanning your connection...', 'Hold tight, running diagnostics.');
}

/* ── Phase 2: Stutter ── */
function phase2_stutter() {
  const currentRot = NEEDLE.mbpsToRot(82);

  // Pass current rotation to CSS custom property for the keyframe
  DOM.needleGroup.style.setProperty('--needle-stutter-pos', `${currentRot}deg`);

  DOM.needleGroup.classList.remove('needle--revving');
  DOM.needleGroup.classList.add('needle--stutter');

  // Flicker the speed number
  let flickerCount = 0;
  const flickerInterval = setInterval(() => {
    const noise = Math.round(Math.random() * 30 - 15);
    DOM.speedValue.textContent = Math.max(0, 82 + noise);
    flickerCount++;
    if (flickerCount >= 6) clearInterval(flickerInterval);
  }, 100);

  updateStatus('Hmm... something\'s not right.', 'Signal unstable.');
}

/* ── Phase 3: Crash ── */
function phase3_crash() {
  DOM.needleGroup.classList.remove('needle--stutter');
  DOM.needleGroup.classList.add('needle--crash');

  // Slam needle to 0
  setNeedle(NEEDLE.start); // 240deg = 0 Mbps
  setGaugeFill(0);

  // Glitch the speed value to 0
  DOM.speedValue.classList.add('is-glitching');
  DOM.speedValue.textContent = '0';
  DOM.pingValue.textContent  = '999 ms';

  // Full-screen red flash
  flashCrashOverlay();

  // Screen shake on the section
  DOM.speedometerSect.classList.add('screen-shake');
  setTimeout(() => DOM.speedometerSect.classList.remove('screen-shake'), 600);

  updateStatus('💀 Connection collapsed.', 'Your ISP has failed you.');
}

/* ── Phase 4: Broken ── */
function phase4_broken() {
  DOM.speedValue.classList.remove('is-glitching');
  DOM.speedValue.textContent = '0';

  // Remove crash transition, add broken state
  DOM.needleGroup.classList.remove('needle--crash');
  DOM.speedometerWrap.classList.add('gauge--broken');

  updateStatus('🔴 Network integrity: FAILED', 'Preparing your roast...');
}

/* ── Phase 5: Reveal ── */
function phase5_reveal() {
  // Populate receipt with placeholder data (Sprint 2)
  populateReceipt({
    speed:    0.1,
    ping:     999,
    grade:    'F',
    isp:      'Unknown Provider',
    location: 'Somewhere, Earth',
    ip:       '114.120.***.***',
    latency:  '999 ms',
    conn:     'Unknown',
    vpn:      'No',
    roast:    'Your internet is so slow, the loading bar gave up and went home. Congratulations — you\'ve achieved dial-up speeds in the fiber era.',
  });

  // Exit the speedometer section
  DOM.speedometerSect.classList.add('section--exit');

  // After exit animation completes, hide it and show receipt
  setTimeout(() => {
    DOM.speedometerSect.style.display = 'none';

    // Inject "Scan Again" button into receipt if not already there
    injectScanAgainButton();

    // Activate receipt
    DOM.receiptStage.classList.add('receipt--active');

    // Restore state partially (receipt shown, but scanning still "done")
    STATE.isScanning = false;
    removeScanningDots();
    DOM.body.classList.remove('is-scanning');
  }, 480);
}


/* ============================================================
   RECEIPT POPULATION
   ============================================================ */
function populateReceipt({ speed, ping, grade, isp, location, ip, latency, conn, vpn, roast }) {
  DOM.receiptTimestamp.textContent = formatTimestamp();
  DOM.receiptSpeedVal.textContent  = speed;
  DOM.receiptPingVal.textContent   = `${ping} ms`;
  DOM.receiptGradeVal.textContent  = grade;
  DOM.receiptIsp.textContent       = isp;
  DOM.receiptLocation.textContent  = location;
  DOM.receiptIp.textContent        = ip;
  DOM.receiptLatency.textContent   = latency;
  DOM.receiptConn.textContent      = conn;
  DOM.receiptVpn.textContent       = vpn;
  DOM.receiptRoast.textContent     = roast;

  // Update live UI receipt-grade colour to warm if failing
  const gradeBanner = document.getElementById('receipt-grade-banner');
  if (gradeBanner && (grade === 'F' || grade === 'D')) {
    gradeBanner.style.borderColor = 'rgba(255, 94, 58, 0.35)';
  }
}


/* ============================================================
   SCAN AGAIN / RESET
   ============================================================ */
function injectScanAgainButton() {
  if (document.getElementById('scan-again-btn')) return;

  const btn = document.createElement('button');
  btn.id        = 'scan-again-btn';
  btn.className = 'scan-again-btn';
  btn.innerHTML = '↺ &nbsp;Scan Again';
  btn.addEventListener('click', resetScan);

  // Append after the receipt footer
  const footer = DOM.receiptStage.querySelector('.receipt-footer');
  if (footer) footer.after(btn);
  else DOM.receiptStage.querySelector('.cyber-receipt').appendChild(btn);
}

function resetScan() {
  // Hide receipt
  DOM.receiptStage.classList.remove('receipt--active');

  // Restore speedometer section
  DOM.speedometerSect.style.display = '';
  DOM.speedometerSect.classList.remove('section--exit', 'screen-shake');

  // Reset needle to start
  DOM.needleGroup.classList.remove('needle--revving', 'needle--stutter', 'needle--crash');
  DOM.needleGroup.style.transform = `rotate(${NEEDLE.start}deg)`;

  // Reset gauge fill
  setGaugeFill(0);

  // Reset gauge broken state
  DOM.speedometerWrap.classList.remove('gauge--broken');
  DOM.speedometerWrap.querySelector('.gauge-track')
    ?.setAttribute('stroke', '');

  // Reset speed / ping readouts
  DOM.speedValue.textContent = '--';
  DOM.speedValue.classList.remove('is-glitching');
  DOM.pingValue.textContent  = '-- ms';

  // Reset status
  updateStatus('Ready to profile your connection.', 'Hit GO and brace yourself.');

  // Re-enable GO button
  STATE.isScanning = false;
  DOM.body.classList.remove('is-scanning');
  removeScanningDots();
}


/* ============================================================
   STATUS HELPER
   ============================================================ */
function updateStatus(primary, secondary = '') {
  if (!DOM.statusBlock) return;
  DOM.statusBlock.querySelector('.status-primary').textContent = primary;
  DOM.statusBlock.querySelector('.status-secondary').innerHTML =
    secondary.replace('GO', '<strong>GO</strong>');
}


/* ============================================================
   ENTRY POINT
   ============================================================ */
function startScan() {
  // Guard: prevent double-clicks
  if (STATE.isScanning) return;

  STATE.isScanning = true;
  STATE.scanCount++;

  // Clear any leftover timers from previous run
  clearAllTimers();

  // Reset visuals cleanly before starting
  DOM.needleGroup.classList.remove('needle--revving', 'needle--stutter', 'needle--crash');
  DOM.speedometerWrap.classList.remove('gauge--broken');
  DOM.speedValue.classList.remove('is-glitching');
  setNeedle(NEEDLE.start);
  setGaugeFill(0);

  // Lock GO button & inject loading dots
  DOM.body.classList.add('is-scanning');
  injectScanningDots();

  // Kick off the 4-second fake-out sequence
  runFakeOutSequence();
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure needle starts at correct position
  setNeedle(NEEDLE.start);
  setGaugeFill(0);

  // GO button
  DOM.goBtn.addEventListener('click', startScan);

  // Keyboard: Space or Enter on GO button
  DOM.goBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      startScan();
    }
  });

  // Close receipt on backdrop click (outside the card)
  DOM.receiptStage.addEventListener('click', (e) => {
    if (e.target === DOM.receiptStage) resetScan();
  });
});
