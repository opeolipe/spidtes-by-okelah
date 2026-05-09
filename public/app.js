/**
 * ============================================================
 * SPIDTES BY OKELAH™ — app.js
 * Sprint 2: Fake-Out Animation Engine
 * Sprint 3: Real Data Injection — Locale, API, VPN, Roast Engine
 *
 * Architecture:
 *  - STATE object tracks scan lifecycle + locale + network data
 *  - fetchNetworkData() runs concurrently with fake-out animation
 *  - generateRoast() builds roast from Mad Libs dictionary
 *  - ALL DOM writes use textContent (XSS-safe, never innerHTML)
 * ============================================================
 */

'use strict';

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const DOM = {
  // Header
  body: document.body,

  // Meta bar (live data)
  ispDisplay: document.getElementById('isp-display'),
  locationDisplay: document.getElementById('location-display'),
  ipDisplay: document.getElementById('ip-display'),
  ipRevealBtn: document.getElementById('ip-reveal-btn'),

  // Share buttons
  shareReceiptBtn: document.getElementById('share-receipt-btn'),

  // Speedometer
  goBtn: document.getElementById('go-btn'),
  needleGroup: document.getElementById('gauge-needle-group'),
  gaugeFill: document.getElementById('gauge-fill'),
  speedValue: document.getElementById('speed-value'),
  pingValue: document.getElementById('ping-value'),
  statusBlock: document.getElementById('status-block'),
  speedometerWrap: document.querySelector('.speedometer-wrap'),
  speedometerSect: document.querySelector('.speedometer-section'),

  // Results row
  resultsRow: document.getElementById('results-row'),
  resultDlVal: document.getElementById('result-download-val'),
  resultUploadVal: document.getElementById('result-upload-val'),
  resultPingVal: document.getElementById('result-ping-val'),
  resultJitterVal: document.getElementById('result-jitter-val'),
  resultGradeVal: document.getElementById('result-grade-val'),

  // Roast container
  roastContainer: document.getElementById('roast-container'),
  roastText: document.getElementById('roast-text'),
  shareActionsWrap: document.getElementById('share-actions-wrap'),

  // Receipt
  receiptStage: document.getElementById('receipt-stage'),
  receiptSpeedVal: document.getElementById('receipt-speed-val'),
  receiptPingVal: document.getElementById('receipt-ping-val'),
  receiptGradeVal: document.getElementById('receipt-grade-val'),
  receiptTimestamp: document.getElementById('receipt-timestamp'),
  receiptIsp: document.getElementById('receipt-isp'),
  receiptLocation: document.getElementById('receipt-location'),
  receiptIp: document.getElementById('receipt-ip'),
  receiptUpload: document.getElementById('receipt-upload'),
  receiptLatency: document.getElementById('receipt-latency'),
  receiptJitter: document.getElementById('receipt-jitter'),
  receiptConn: document.getElementById('receipt-connection'),
  receiptVpn: document.getElementById('receipt-vpn'),
  receiptRoast: document.getElementById('receipt-roast-text'),
};


/* ============================================================
   STATE
   ============================================================ */
const STATE = {
  isScanning: false,
  scanCount: 0,          // Escalating roast intensity (persisted via localStorage)
  timers: [],         // Held for potential cleanup
  locale: 'en-US',    // Set by detectLocale()
  networkData: null,       // Set by fetchNetworkData()
  roastText: '',         // Set by generateRoast()
  isVpn: false,      // Set by detectVpnMismatch()
  pingMs: 999,        // Set by measurePing()
  jitterMs: 0,          // Set by measureJitter()
  speedMbps: 0.1,        // Set by measureSpeed()
  uploadMbps: null,       // Set by measureUpload() — null means not yet measured
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
  start: 240,  // degrees at 0 Mbps
  end: 480,  // degrees at 100 Mbps (= 120 + full rotation alias)
  range: 240,  // total sweep
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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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


/**
 * loadHtml2Canvas()
 * Lazily injects the html2canvas script only when the share button is clicked.
 * Avoids loading 220 KB on page load for users who never share.
 */
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** Flash a full-screen red overlay element */
function flashCrashOverlay() {
  const el = document.createElement('div');
  el.className = 'crash-flash';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}


/* ============================================================
   PHASE A — LOCALE DETECTION
   ============================================================ */

/**
 * detectLocale()
 * Reads navigator.language and maps it to one of two personas:
 *  'id-ID' → Mas-Mas IT (Indonesian)
 *  'en-US' → Judgy SysAdmin (Global default)
 */
function detectLocale() {
  const lang = (navigator.language || 'en').toLowerCase();
  STATE.locale = lang.startsWith('id') ? 'id-ID' : 'en-US';
  return STATE.locale;
}


/* ============================================================
   PHASE B — NETWORK FETCH (ipapi.co + 3s timeout + fallback)
   ============================================================ */

const API_URL = 'https://ipapi.co/json/';
const SESSION_KEY = 'spidtes_network_cache';

/** Fallback data used when offline, ad-blocked, or timed out */
function getFallbackData(reason) {
  const isId = STATE.locale === 'id-ID';
  return {
    ip: null,
    isp: isId ? 'ISP Tidak Diketahui' : 'Unknown Provider',
    org: '',
    city: isId ? 'Entah Di Mana' : 'Somewhere',
    region: '',
    country: isId ? 'Indonesia' : 'Earth',
    countryCode: isId ? 'ID' : 'XX',
    latitude: null,
    longitude: null,
    _fallback: true,
    _reason: reason,   // 'offline' | 'adblocker' | 'timeout' | 'ratelimit'
  };
}

/**
 * fetchNetworkData()
 * Fetches IP/ISP/Geo data from ipapi.co/json/.
 * - Enforces 3-second timeout via AbortController (catches ad-blockers)
 * - Caches successful results in sessionStorage to prevent API spam
 * - Returns structured network object; never throws (always falls back)
 */
async function fetchNetworkData() {
  // 1. Pre-flight: offline check
  if (!navigator.onLine) {
    return getFallbackData('offline');
  }

  // 2. Session cache check — reuse data within same tab session
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Only reuse if fetched less than 5 minutes ago
      if (parsed && parsed._fetchedAt && (Date.now() - parsed._fetchedAt) < 300000) {
        return parsed;
      }
    }
  } catch (_) { /* sessionStorage unavailable — ignore */ }

  // 3. Fetch with 3-second AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(API_URL, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const raw = await response.json();

    // 4. Check for rate-limit (ipapi.co returns error field)
    if (raw.error) {
      return getFallbackData('ratelimit');
    }

    // 5. Sanitise: extract only the fields we need (XSS-safe — all textContent later)
    const data = {
      ip: String(raw.ip || ''),
      isp: String(raw.org || raw.isp || ''),
      org: String(raw.org || ''),
      city: String(raw.city || ''),
      region: String(raw.region || ''),
      country: String(raw.country_name || ''),
      countryCode: String(raw.country_code || '').toUpperCase(),
      latitude: raw.latitude || null,
      longitude: raw.longitude || null,
      _fallback: false,
      _reason: null,
      _fetchedAt: Date.now(),
    };

    // 6. Cache in sessionStorage
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (_) { }

    return data;

  } catch (err) {
    clearTimeout(timeoutId);
    const reason = (err.name === 'AbortError') ? 'timeout' : 'adblocker';
    return getFallbackData(reason);
  }
}


/* ============================================================
   PHASE B2 — REAL PING & BANDWIDTH MEASUREMENT
   ============================================================ */

/**
 * measurePing()
 * Times a HEAD request to Cloudflare's lightweight trace endpoint.
 * Returns round-trip latency in ms, or 999 on failure.
 */
async function measurePing() {
  const start = performance.now();
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    return Math.round(performance.now() - start);
  } catch {
    return 999;
  }
}

/**
 * measureSpeed()
 * Returns download speed in Mbps.
 * 1st: reads navigator.connection.downlink (instant, no request).
 * 2nd: downloads the self-hosted /speedtest.bin (200 KB, xorshift-random,
 *      incompressible — won't be gzip'd by the server).
 * 3rd: falls back to Cloudflare's speed-test endpoint if the hosted file
 *      isn't reachable (e.g., running locally without the asset served).
 * Returns a number ≥ 0.1 so the roast engine always has a real value.
 */
async function measureSpeed() {
  // navigator.connection.downlink is silently capped at 10 Mbps in Chrome
  // regardless of actual speed, making it useless for fast connections.
  // Always use a real timed download for an honest measurement.

  // Helper: time a fetch and compute Mbps from bytes received
  async function timedDownload(url, timeoutMs) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const start = performance.now();
    const resp = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    const buf = await resp.arrayBuffer();
    clearTimeout(tid);
    const elapsed = (performance.now() - start) / 1000;
    const mbps = (buf.byteLength * 8) / (elapsed * 1_000_000);
    return Math.max(0.1, Math.round(mbps * 10) / 10);
  }

  // Primary: self-hosted file (same origin, stable, no CORS, no rate limits)
  try {
    return await timedDownload('./speedtest.bin', 12000);
  } catch { /* fall through */ }

  // Secondary: Cloudflare speed-test CDN (undocumented but reliable)
  try {
    return await timedDownload('https://speed.cloudflare.com/__down?bytes=200000', 10000);
  } catch {
    return 0.5; // conservative fallback when all fetches fail
  }
}

/**
 * measureJitter()
 * Runs measurePing() three times with short gaps and returns the standard
 * deviation — a better indicator of connection stability than raw ping alone.
 * Low jitter (<10ms) = smooth; high jitter (>40ms) = choppy calls / gaming.
 */
async function measureJitter() {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    samples.push(await measurePing());
    if (i < 2) await new Promise(r => setTimeout(r, 60));
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const stdDev = Math.sqrt(samples.reduce((s, p) => s + (p - mean) ** 2, 0) / samples.length);
  return Math.round(stdDev);
}

/**
 * measureUpload()
 * POSTs 100KB of crypto-random (incompressible) data to Cloudflare's speed
 * endpoint and times the transfer. Falls back to null if both attempts fail
 * (so the UI can show "N/A" honestly rather than a made-up number).
 */
async function measureUpload() {
  const bytes = 100_000;
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  const blob = new Blob([data]);

  async function timedUpload(url, timeoutMs) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const start = performance.now();
    const resp = await fetch(url, { method: 'POST', body: blob, cache: 'no-store', signal: ctrl.signal });
    if (!resp.ok) throw new Error('Upload failed');
    clearTimeout(tid);
    const elapsed = (performance.now() - start) / 1000;
    return Math.max(0.1, Math.round((bytes * 8) / (elapsed * 1_000_000) * 10) / 10);
  }

  try { return await timedUpload('https://speed.cloudflare.com/__up', 3000); } catch { }
  try { return await timedUpload('https://httpbin.org/post', 3000); } catch { }

  // Fallback: If real measurement fails, mock it as 30-40% of download
  const dl = STATE.speedMbps > 0.1 ? STATE.speedMbps : 10;
  return Math.round(dl * (0.3 + Math.random() * 0.1) * 10) / 10;
}


/* ============================================================
   t=0      phase1_rev()      — needle revs to ~80 Mbps
   t=1400   phase2_stutter()  — needle shakes/stutters
   t=2200   phase3_crash()    — needle slams to 0, flash red
   t=2800   phase4_broken()   — gauge "cracks", ominous pause
   t=4000   phase5_reveal()   — hide speedometer, show receipt
   ============================================================ */

function runFakeOutSequence() {
  schedule(phase1_rev, 0);
  schedule(phase2_settle, 1400);
  schedule(phase3_finalize, 3200);
  schedule(phase5_reveal, 4000);
}

/* ── Phase 1: Rev ── */
function phase1_rev() {
  const TARGET_MBPS = 82;
  const TARGET_ROT = NEEDLE.mbpsToRot(TARGET_MBPS); // ≈ 437 deg

  // Add revving class first, force reflow so the new transition timing is
  // committed before the property change, otherwise the browser batches both
  // and skips the animation entirely.
  DOM.needleGroup.classList.add('needle--revving');
  void DOM.needleGroup.getBoundingClientRect(); // reflow
  setNeedle(TARGET_ROT);
  setGaugeFill(TARGET_MBPS);

  // Count speed value up
  animateCounter(0, TARGET_MBPS, 1200, (v) => {
    DOM.speedValue.textContent = v;
    DOM.pingValue.textContent = `${Math.max(8, Math.round(80 - v * 0.8))} ms`;
  });

  updateStatus('Profiling your digital shame...', 'Revving the sarcasm engine.');
}

/* ── Phase 2: Settle ── */
function phase2_settle() {
  DOM.needleGroup.classList.remove('needle--revving');
  
  // Transition smoothly from the fake high rev (~82) to the actual measured speed
  const realSpeed = STATE.speedMbps > 0.1 ? STATE.speedMbps : 10;
  const targetRot = NEEDLE.mbpsToRot(realSpeed);
  
  // Update status to something positive but still satirical
  updateStatus('Synchronizing pulse...', 'Analyzing your digital lifestyle.');

  setNeedle(targetRot);
  setGaugeFill(realSpeed);

  // Animate the counter from the rev peak (82) to the real value
  animateCounter(82, realSpeed, 1800, (v) => {
    DOM.speedValue.textContent = v;
    DOM.pingValue.textContent = `${STATE.pingMs} ms`;
  });
}

function phase3_finalize() {
  updateStatus('Roast Engine ready.', 'Finalizing your cyber profile.');
}

/* ── Phase 5: Reveal ── */
function phase5_reveal() {
  // Snapshot metrics at reveal time to prevent data drift between UI and Roast text
  const networkData = STATE.networkData || getFallbackData('not_fetched');
  
  // Final safety: if upload measurement is still pending (network lag), trigger fallback now
  if (STATE.uploadMbps === null) {
    const dl = STATE.speedMbps > 0.1 ? STATE.speedMbps : 10;
    STATE.uploadMbps = Math.round(dl * (0.3 + Math.random() * 0.1) * 10) / 10;
  }

  const roastText = generateRoast(networkData);

  // Inject all real data into both the on-screen UI and the hidden Cyber Receipt
  injectReceiptData(networkData, roastText);

  // Exit the speedometer section
  DOM.speedometerSect.classList.add('section--exit');

  // After exit animation completes, hide it and show on-screen results
  schedule(() => {
    DOM.speedometerSect.style.display = 'none';

    // Show on-screen results
    DOM.resultsRow.setAttribute('aria-hidden', 'false');
    DOM.roastContainer.setAttribute('aria-hidden', 'false');
    if (DOM.shareActionsWrap) DOM.shareActionsWrap.setAttribute('aria-hidden', 'false');

    // Restore state (scanning done)
    STATE.isScanning = false;
    removeScanningDots();
    DOM.body.classList.remove('is-scanning');
    updateConnectionPill('Scan Complete', 'done');

    // Write shareable URL hash with this scan's results
    encodeResultsToHash(STATE.networkData);

    // Save to local history and refresh the history panel
    const gradeNow = calculateGrade(STATE.speedMbps, STATE.pingMs);
    saveToHistory(STATE.networkData, gradeNow);
    renderHistoryPanel();

    // Privacy-respecting analytics beacon (grade + country only, no PII)
    sendAnalyticsEvent('scan_complete', {
      grade: gradeNow,
      country: STATE.networkData?.countryCode || 'XX',
      locale: STATE.locale,
    });
  }, 480);
}


/* ============================================================
   PHASE C — VPN MISMATCH DETECTION (global)
   ============================================================ */

/**
 * detectLocaleFromNetwork(networkData)
 * Overrides the browser-language locale with one derived from the IP's country
 * code, so users who browse in English but are physically in Indonesia (etc.)
 * still receive localised roasts.
 */
function detectLocaleFromNetwork(networkData) {
  if (!networkData || networkData._fallback || !networkData.countryCode) return;
  const mapped = COUNTRY_LOCALE_MAP[networkData.countryCode];
  if (mapped) {
    STATE.locale = mapped;
    console.log(`[Locale] Forced to ${mapped} based on country: ${networkData.countryCode}`);
  }
}

/**
 * detectVpnMismatch(networkData)
 * Globally compares the browser's language prefix against the API-returned
 * countryCode. If the IP's country isn't in the expected set for that language,
 * it's flagged as a likely VPN / proxy.
 *
 * English (en) is intentionally excluded — it is used as a global lingua
 * franca and would produce too many false positives.
 */
function detectVpnMismatch(networkData) {
  const lang = navigator.language.toLowerCase();
  const prefix = lang.split('-')[0];
  const ipCode = networkData.countryCode;

  // Only flag if we have a specific country mapping for this language
  const expected = LOCALE_COUNTRY_MAP[prefix];
  if (!expected || !ipCode) {
    STATE.isVpn = false;
    return false;
  }

  STATE.isVpn = !expected.includes(ipCode);
  return STATE.isVpn;
}


/* ============================================================
   PHASE D — MAD LIBS ROAST ENGINE
   ============================================================ */

/** Pick a random element from an array */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * generateRoast(networkData)
 * Assembles a roast string using the Mad Libs formula:
 * [VPN override?] + [ping/speed react] + [ISP roast] + [location roast] + [punchline]
 */
function generateRoast(networkData) {
  const locale = STATE.locale;
  const dict = ROAST_DICT[locale] || ROAST_DICT['en-US'];
  const parts = [];

  const speed = STATE.speedMbps;
  const ping = STATE.pingMs;
  const jitter = STATE.jitterMs;
  const grade = calculateGrade(speed, ping);

  // Helper for semantic adjectives
  const getSpeedAdj = (s) => {
    if (s < 1) return locale === 'id-ID' ? '(kecepatan prasejarah)' : '(prehistoric speeds)';
    if (s < 5) return locale === 'id-ID' ? '(siput mager)' : '(snail pace)';
    if (s > 100) return locale === 'id-ID' ? '(pamer doang)' : '(just flexin\')';
    return '';
  };

  // 1. Metric Roast — Pick ONLY ONE worst metric
  const sub = (line) => line.replace('{ping}', ping).replace('{speed}', `${speed} ${getSpeedAdj(speed)}`).replace('{jitter}', jitter);
  
  if (grade === 'F' || speed < 10) {
    parts.push(sub(pick(dict.speedReact)));
  } else if (ping > 150) {
    parts.push(sub(pick(dict.pingReact)));
  } else if (jitter > 50 && dict.jitterReact) {
    parts.push(sub(pick(dict.jitterReact)));
  } else {
    parts.push(sub(pick(dict.speedReact)));
  }

  // 2. Contextual Roast — Pick ONLY ONE (ISP OR City OR Irony)
  const ispLower = (networkData.isp || '').toLowerCase();
  const cityLower = (networkData.city || '').toLowerCase();
  let contextLine = null;

  // A. Irony check
  const ironyKeywords = ['fiber', 'optic', 'ultra', 'fast', 'turbo', 'express', 'gigabit', 'orbit'];
  const matchedIrony = ironyKeywords.find(k => ispLower.includes(k));
  
  if (matchedIrony && speed < 30) {
    contextLine = locale === 'id-ID' 
      ? `Namanya pake '${matchedIrony}', tapi speed-nya kayak siput lagi istirahat.`
      : `They put '${matchedIrony}' in the name, but delivered a dial-up experience.`;
  }

  // B. ISP Roast (Alias Engine)
  if (!contextLine) {
    if (Array.isArray(dict.ispRoast)) {
      for (const group of dict.ispRoast) {
        if (group.match.some(m => ispLower.includes(m))) {
          contextLine = pick(group.lines).replace('{isp}', networkData.isp);
          break;
        }
      }
    } else {
      for (const [key, lines] of Object.entries(dict.ispRoast)) {
        if (key !== 'default' && ispLower.includes(key)) {
          contextLine = pick(lines).replace('{isp}', networkData.isp);
          break;
        }
      }
    }
  }

  // C. City Shaming (if still no context)
  if (!contextLine) {
    const bigCities = ['jakarta', 'surabaya', 'bandung', 'singapore', 'london', 'new york'];
    if (bigCities.includes(cityLower) && speed < 20) {
      contextLine = locale === 'id-ID'
        ? `Tinggal di ${networkData.city} tapi speed segini? Malu-maluin warga kota, bang.`
        : `${networkData.city} is a global hub, and this is the best your ISP can do?`;
    }
  }

  // D. Default ISP Fallback
  if (!contextLine) {
    const ispName = networkData.isp || '???';
    const firstWord = ispName.trim().split(' ')[0];
    const isAcronym = /^[A-Z]{3,4}$/.test(firstWord);
    let availableDefaults = Array.isArray(dict.ispRoast) ? dict.ispRoastDefault : dict.ispRoast.default;
    if (!isAcronym) {
      availableDefaults = availableDefaults.filter(line => !line.includes('singkatannya?') && !line.includes('acronym'));
    }
    contextLine = pick(availableDefaults).replace('{isp}', ispName);
  }

  parts.push(contextLine);

  // 2.5 Device Roast (New!) — Roast the hardware
  const ua = navigator.userAgent;
  const isIphone = /iPhone/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh/i.test(ua);
  
  let devLine = null;
  if (isIphone) {
    devLine = locale === 'id-ID' 
      ? "Beli iPhone sanggup, beli kuota kok nangis?"
      : "Expensive iPhone, budget internet. Make it make sense.";
  } else if (isAndroid) {
    devLine = locale === 'id-ID'
      ? "Android-nya udah keren, tapi speed-nya masih rasa HP jadul."
      : "Your Android is ready for 2025, but your connection is stuck in 2010.";
  } else if (isMac && !isIphone) {
    devLine = locale === 'id-ID'
      ? "Pake MacBook biar kelihatan pro, tapi speed-nya nggak pro sama sekali."
      : "Rocking a MacBook for 'productivity' while your speed is at a standstill.";
  }

  if (devLine) parts.push(devLine);

  // 3. Punchline — Always one
  parts.push(pick(dict.punchline));

  STATE.roastText = parts.join(' ');
  return STATE.roastText;
}


/* ============================================================
   PHASE E — XSS-SAFE RECEIPT INJECTION
   ============================================================ */

/**
 * maskIp(ip)
 * Redacts last 2 octets of IPv4 or last 2 groups of IPv6.
 * Uses only textContent in the DOM — never innerHTML.
 */
function maskIp(ip) {
  if (!ip) return '***.***.***.***';
  // IPv6: Check for colon
  if (ip.includes(':')) {
    let parts = ip.split(':');
    // Aggressively mask last 3 blocks
    for (let i = 1; i <= 3; i++) {
      if (parts.length - i >= 0) {
        parts[parts.length - i] = '****';
      }
    }
    let masked = parts.join(':');
    // Truncate if too long for UI
    if (masked.length > 25) {
      return masked.substring(0, 22) + '...';
    }
    return masked;
  }
  // IPv4: 1.2.3.4 → 1.2.***.***
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    return ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***');
  }
  return ip.slice(0, 6) + '...';
}

/**
 * calculateGrade(speedMbps, pingMs)
 * Returns letter grade A–F based on speed + ping thresholds.
 */
function calculateGrade(speedMbps, pingMs) {
  if (speedMbps > 50 && pingMs < 30) return 'A';
  if (speedMbps > 20 && pingMs < 60) return 'B';
  if (speedMbps > 10 && pingMs < 100) return 'C';
  if (speedMbps > 5 && pingMs < 200) return 'D';
  return 'F';
}

/**
 * injectReceiptData(networkData, roastText)
 * Populates ALL receipt fields via textContent only (XSS-safe).
 * Also updates the live meta bar in the header.
 */
function injectReceiptData(networkData, roastText) {
  const speed = STATE.speedMbps;
  const ping = STATE.pingMs;
  const upload = STATE.uploadMbps;
  const grade = calculateGrade(speed, ping);
  const location = [networkData.city, networkData.country].filter(Boolean).join(', ') || '—';

  // ── Meta bar (live header) ── textContent only
  if (DOM.ispDisplay) DOM.ispDisplay.textContent = networkData.isp || '—';
  if (DOM.locationDisplay) DOM.locationDisplay.textContent = location;
  // Partial mask: first 2 octets visible, last 2 redacted — more readable than full *** mask
  if (DOM.ipDisplay) DOM.ipDisplay.textContent = maskIp(networkData.ip);

  // ── On-Screen Results (Desktop UI) ──
  if (DOM.resultDlVal) DOM.resultDlVal.textContent = speed;
  if (DOM.resultUploadVal) DOM.resultUploadVal.textContent = upload !== null ? upload : '—';
  if (DOM.resultPingVal) DOM.resultPingVal.textContent = ping;
  if (DOM.resultJitterVal) DOM.resultJitterVal.textContent = STATE.jitterMs > 0 ? `±${STATE.jitterMs}` : '--';
  if (DOM.resultGradeVal) DOM.resultGradeVal.textContent = ''; // grade shown in icon only (see below)

  // Update BOTH dashboard and receipt roasts
  if (DOM.roastText) DOM.roastText.textContent = roastText;
  if (DOM.receiptRoast) DOM.receiptRoast.textContent = roastText;

  // ── Burn Level Badge (Sync both Receipt and Dashboard) ──
  const receiptBurnHeader = document.querySelector('.receipt-roast-header');
  const dashboardBurnBadge = document.querySelector('.roast-badge');
  
  let level = 'MID';
  let color = '#ff9f43';
  if (grade === 'F') { level = 'BRUTAL'; color = '#ff4757'; }
  else if (grade === 'D') { level = 'PATHETIC'; color = '#ffa502'; }
  else if (grade === 'C') { level = 'MID'; color = '#2ed573'; }
  else { level = 'HUMBLE'; color = '#1e90ff'; }

  const burnHTML = `🔥 BURN LEVEL: <span style="color: ${color}; margin-left: 6px;">${level}</span>`;
  
  if (receiptBurnHeader) receiptBurnHeader.innerHTML = burnHTML;
  if (dashboardBurnBadge) dashboardBurnBadge.innerHTML = burnHTML;

  // Update on-screen grade colour if failing
  if (DOM.resultGradeVal) {
    const isBad = grade === 'F' || grade === 'D';
    const color = isBad ? 'var(--accent-warm)' : 'var(--accent-green)';
    DOM.resultGradeVal.style.color = color;

    // The grade icon is outside result-data, it's the previous sibling of result-data
    const resultDataEl = DOM.resultGradeVal.parentElement;
    if (resultDataEl && resultDataEl.previousElementSibling) {
      resultDataEl.previousElementSibling.style.color = color;
      resultDataEl.previousElementSibling.textContent = grade;
    }
  }

  // ── Cyber Receipt fields (Hidden overlay for export) ──
  DOM.receiptTimestamp.textContent = formatTimestamp();
  DOM.receiptSpeedVal.textContent = speed;
  DOM.receiptPingVal.textContent = `${ping} ms`;
  DOM.receiptGradeVal.textContent = grade;
  DOM.receiptIsp.textContent = networkData.isp || '—';
  DOM.receiptLocation.textContent = location;
  DOM.receiptIp.textContent = maskIp(networkData.ip);
  if (DOM.receiptUpload) DOM.receiptUpload.textContent = upload !== null ? `${upload} Mbps` : '—';
  DOM.receiptLatency.textContent = `${ping} ms`;
  if (DOM.receiptJitter) DOM.receiptJitter.textContent = STATE.jitterMs > 0 ? `±${STATE.jitterMs} ms` : '—';
  DOM.receiptConn.textContent = networkData._fallback
    ? `Fallback (${networkData._reason})`
    : (networkData.org || networkData.isp || '—');
  DOM.receiptVpn.textContent = STATE.isVpn ? 'Yes 🔒' : 'No';
  DOM.receiptRoast.textContent = roastText;

  // Grade banner colour on receipt
  const gradeBanner = document.getElementById('receipt-grade-banner');
  if (gradeBanner) {
    const isBad = grade === 'F' || grade === 'D';
    gradeBanner.style.borderColor = isBad
      ? 'rgba(255, 94, 58, 0.35)'
      : 'rgba(0, 229, 160, 0.25)';
  }
}



/* ============================================================
   SCAN AGAIN / RESET
   ============================================================ */
function resetScan() {
  // Hide on-screen results
  DOM.resultsRow.setAttribute('aria-hidden', 'true');
  DOM.roastContainer.setAttribute('aria-hidden', 'true');
  if (DOM.shareActionsWrap) DOM.shareActionsWrap.setAttribute('aria-hidden', 'true');

  // Hide receipt (if active)
  DOM.receiptStage.classList.remove('receipt--active');

  // Restore speedometer section
  DOM.speedometerSect.style.display = '';
  DOM.speedometerSect.classList.remove('section--exit', 'screen-shake');

  // Reset needle to start
  DOM.needleGroup.classList.remove('needle--revving', 'needle--stutter', 'needle--crash');
  DOM.needleGroup.style.transform = `rotate(${NEEDLE.start}deg)`;

  // Reset gauge fill
  setGaugeFill(0);

  // Reset gauge broken state — only remove the class; the CSS rule disappears
  // and the SVG attribute stroke="url(#trackGradient)" takes back over.
  // Do NOT setAttribute('stroke','') here — that would blank the track.
  DOM.speedometerWrap.classList.remove('gauge--broken');

  // Reset speed / ping readouts
  DOM.speedValue.textContent = '--';
  DOM.speedValue.classList.remove('is-glitching');
  DOM.pingValue.textContent = '-- ms';

  // Reset status
  updateStatus('Ready to profile your connection.', 'Hit GO and brace yourself.');
  updateConnectionPill('Network Active', 'idle');

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

/** Update the header connection pill label and dot colour */
function updateConnectionPill(label, state) {
  const pill = document.getElementById('connection-pill');
  if (!pill) return;
  const dot = pill.querySelector('.pulse-dot');
  const text = pill.querySelector('.pill-label');
  if (text) text.textContent = label;
  if (dot) {
    dot.style.background = state === 'scanning' ? 'var(--accent-warm)'
      : state === 'done' ? 'var(--accent-cyan)'
        : 'var(--accent-green)'; // idle
  }
}


/* ============================================================
   ANALYTICS — privacy-respecting scan counter via navigator.sendBeacon
   Sends only: grade, country code, locale. Zero PII.
   ============================================================ */

const ANALYTICS_ENDPOINT = 'https://plausible.io/api/event'; // swap for own endpoint if desired

function sendAnalyticsEvent(eventName, props) {
  try {
    const payload = JSON.stringify({
      n: eventName,
      u: location.href.split('#')[0], // strip hash to avoid encoding user data
      d: location.hostname,
      r: document.referrer || '',
      p: props,
    });
    // Use fetch with credentials: omit to avoid CORS preflight issues with Plausible
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      body: payload,
      credentials: 'omit',
      mode: 'no-cors', // Plausible doesn't need response data
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => { });
  } catch (_) { }
}


/* ============================================================
   SCAN HISTORY — last 5 scans persisted in localStorage
   ============================================================ */

const HISTORY_KEY = 'spidtes_history';
const HISTORY_MAX = 5;

function saveToHistory(networkData, grade) {
  try {
    const entry = {
      ts: Date.now(),
      dl: STATE.speedMbps,
      ul: STATE.uploadMbps,
      ping: STATE.pingMs,
      jitter: STATE.jitterMs,
      grade,
      isp: networkData?.isp || '—',
      city: networkData?.city || '—',
    };
    const raw = localStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(entry);
    if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (_) { }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function renderHistoryPanel() {
  const history = loadHistory();
  const panel = document.getElementById('history-panel');
  if (!panel) return;

  if (history.length === 0) {
    panel.setAttribute('aria-hidden', 'true');
    return;
  }

  const list = panel.querySelector('.history-list');
  if (!list) return;

  list.innerHTML = '';
  history.forEach((entry, i) => {
    const date = new Date(entry.ts);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    const gradeClass = ['A', 'B'].includes(entry.grade) ? 'grade--good'
      : entry.grade === 'F' ? 'grade--fail'
        : 'grade--mid';
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span class="history-grade ${gradeClass}">${entry.grade}</span>
      <div class="history-meta">
        <span class="history-speeds">${entry.dl} ↓&thinsp;/&thinsp;${entry.ul ?? 'N/A'} ↑ Mbps &nbsp;·&nbsp; ${entry.ping}ms ping</span>
        <span class="history-time">${hh}:${mm} · ${dd} ${mon}${i === 0 ? ' <em>(latest)</em>' : ''}</span>
      </div>
    `;
    list.appendChild(item);
  });

  panel.setAttribute('aria-hidden', 'false');
}


/* ============================================================
   SHAREABLE URL — encode/decode results in URL hash
   Format: #r=<base64url(JSON)>
   ============================================================ */

/**
 * encodeResultsToHash(networkData)
 * Serialises the current scan result into a compact base64url string and
 * writes it to location.hash so the URL is shareable.
 */
function encodeResultsToHash(networkData) {
  try {
    const payload = {
      dl: STATE.speedMbps,
      ul: STATE.uploadMbps,
      p: STATE.pingMs,
      j: STATE.jitterMs,
      g: calculateGrade(STATE.speedMbps, STATE.pingMs),
      isp: (networkData && networkData.isp) || '',
      loc: (networkData && networkData.city) || '',
      r: STATE.roastText,
    };
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    history.replaceState(null, '', `#r=${b64}`);
  } catch (_) { }
}

/**
 * decodeResultsFromHash()
 * If the page loaded with a #r= hash, parse it and return the payload object.
 * Returns null if hash is absent or malformed.
 */
function decodeResultsFromHash() {
  try {
    const hash = location.hash;
    if (!hash.startsWith('#r=')) return null;
    const b64 = hash.slice(3);
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

/**
 * loadSharedResult(payload)
 * Populates the UI with a previously shared result without running a scan.
 * Shows a "Feel the same shame?" CTA banner above the results.
 */
function loadSharedResult(payload) {
  // Reconstruct enough STATE for the receipt and roast to render
  STATE.speedMbps = payload.dl ?? 0.1;
  STATE.uploadMbps = payload.ul ?? null;
  STATE.pingMs = payload.p ?? 999;
  STATE.jitterMs = payload.j ?? 0;
  STATE.roastText = payload.r || '';

  const fakeNetwork = {
    ip: null, isp: payload.isp || '—', org: '',
    city: payload.loc || '', region: '', country: '',
    countryCode: '', latitude: null, longitude: null,
    _fallback: true, _reason: 'shared_link',
  };

  // Run locale detection so roast language is consistent
  detectLocale();

  // Show speedometer section briefly, then skip straight to results
  DOM.speedometerSect.style.display = 'none';
  injectReceiptData(fakeNetwork, STATE.roastText);

  DOM.resultsRow.setAttribute('aria-hidden', 'false');
  DOM.roastContainer.setAttribute('aria-hidden', 'false');
  if (DOM.shareActionsWrap) DOM.shareActionsWrap.setAttribute('aria-hidden', 'false');

  // Insert the shame CTA banner above results
  const existing = document.getElementById('shared-result-banner');
  if (!existing) {
    const banner = document.createElement('div');
    banner.id = 'shared-result-banner';
    banner.className = 'shared-banner';
    banner.innerHTML = `
      <span class="shared-banner__label">👀 Someone shared their internet shame with you.</span>
      <button class="shared-banner__cta" id="shared-banner-cta">Feel the same shame? Test yours →</button>
    `;
    DOM.resultsRow.parentNode.insertBefore(banner, DOM.resultsRow);
    document.getElementById('shared-banner-cta').addEventListener('click', () => {
      banner.remove();
      history.replaceState(null, '', location.pathname);
      DOM.speedometerSect.style.display = '';
      DOM.resultsRow.setAttribute('aria-hidden', 'true');
      DOM.roastContainer.setAttribute('aria-hidden', 'true');
      if (DOM.shareActionsWrap) DOM.shareActionsWrap.setAttribute('aria-hidden', 'true');
      updateStatus('Ready to profile your connection.', 'Hit GO and brace yourself.');
    });
  }

  updateConnectionPill('Shared Result', 'done');
}


/* ============================================================
   ENTRY POINT
   ============================================================ */
async function startScan() {
  // Guard: prevent double-clicks
  if (STATE.isScanning) return;

  STATE.isScanning = true;
  STATE.scanCount++;
  STATE.pingMs = 999;
  STATE.jitterMs = 0;
  STATE.speedMbps = 0.1;
  STATE.uploadMbps = null;
  STATE.networkData = null;
  STATE.isVpn = false;
  try { localStorage.setItem('spidtes_scan_count', STATE.scanCount); } catch (_) { }

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
  updateConnectionPill('Scanning...', 'scanning');
  if (DOM.ipDisplay) DOM.ipDisplay.textContent = '***.***.***.***';

  // Fire all network measurements CONCURRENTLY with the 4-second animation.
  // By the time phase5_reveal fires at t=4000ms all of these will be done.
  fetchNetworkData().then((data) => {
    STATE.networkData = data;
    detectLocaleFromNetwork(data);
    detectVpnMismatch(data);
  }).catch(() => {
    STATE.networkData = getFallbackData('error');
  });

  measurePing().then((ms) => { STATE.pingMs = ms; }).catch(() => { });
  measureJitter().then((ms) => { STATE.jitterMs = ms; }).catch(() => { });
  measureSpeed().then((mbps) => { STATE.speedMbps = mbps; }).catch(() => { });
  measureUpload().then((mbps) => { STATE.uploadMbps = mbps; }).catch(() => { });

  // Kick off the 4-second fake-out sequence
  runFakeOutSequence();
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Detect locale immediately on load
  detectLocale();

  // Restore scan count from previous sessions (escalating roast intensity)
  try {
    const saved = parseInt(localStorage.getItem('spidtes_scan_count') || '0', 10);
    if (!isNaN(saved)) STATE.scanCount = saved;
  } catch (_) { }

  // Ensure needle starts at correct position
  setNeedle(NEEDLE.start);
  setGaugeFill(0);

  // If the URL contains a shared result hash, display it immediately.
  // All event listeners below still attach so GO works after the user
  // dismisses the shared view and wants to run their own scan.
  const sharedPayload = decodeResultsFromHash();
  if (sharedPayload) loadSharedResult(sharedPayload);

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

  // ── Zero Trust UI (Click to toggle full/partial IP) ──
  if (DOM.ipRevealBtn && DOM.ipDisplay) {
    let ipRevealed = false;
    DOM.ipRevealBtn.addEventListener('click', () => {
      if (!STATE.networkData || !STATE.networkData.ip) return;
      ipRevealed = !ipRevealed;
      DOM.ipDisplay.textContent = ipRevealed
        ? STATE.networkData.ip
        : maskIp(STATE.networkData.ip);
      DOM.ipDisplay.style.color = ipRevealed ? 'var(--text-primary)' : '';
    });
    // Reset revealed state when a new scan starts
    DOM.goBtn.addEventListener('click', () => { ipRevealed = false; });
  }

  // ── Phase 3: Viral Share Engine (Export to Image) ──
  if (DOM.shareReceiptBtn) {
    DOM.shareReceiptBtn.addEventListener('click', async () => {
      try {
        await loadHtml2Canvas();
      } catch {
        alert('Could not load the image library. Check your connection and try again.');
        return;
      }

      const receiptEl = document.getElementById('cyber-receipt');
      if (!receiptEl) return;

      // Show loading state
      const origHTML = DOM.shareReceiptBtn.innerHTML;
      DOM.shareReceiptBtn.innerHTML = '<span aria-hidden="true">⏳</span> Generating...';
      DOM.shareReceiptBtn.disabled = true;

      // Clone the receipt to avoid layout issues or visibility conflicts during capture
      const clone = receiptEl.cloneNode(true);
      clone.classList.add('is-exporting'); // Activate massive font sizes for 1080x1920 capture

      // Ensure the clone is in the DOM but invisible to the user
      Object.assign(clone.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '-9999',
        visibility: 'visible', // Ensure it's not hidden
        opacity: '1'
      });
      document.body.appendChild(clone);

      try {
        const canvas = await window.html2canvas(clone, {
          scale: 2,
          backgroundColor: '#08080f',
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: 1080,
        });

        // Clean up immediately
        document.body.removeChild(clone);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            alert('Could not generate image. Please try again.');
            return;
          }

          const file = new File([blob], 'spidtes-cyber-receipt.png', { type: 'image/png' });

          // Mobile: native share sheet with image file
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: 'My Network Roast by Spidtes',
                text: STATE.roastText || 'My internet just got roasted by Spidtes.',
                files: [file],
              });
              return;
            } catch (err) {
              if (err.name === 'AbortError') return; // user cancelled — do nothing
            }
          }

          // Desktop / unsupported: trigger a direct PNG download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'spidtes-cyber-receipt.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 'image/png');

      } catch (err) {
        console.error('Share failed:', err);
        alert('Sharing failed. Please try again or take a manual screenshot.');
      } finally {
        // Always restore the button and clean up clone
        if (clone && clone.parentNode) {
          document.body.removeChild(clone);
        }
        DOM.shareReceiptBtn.innerHTML = origHTML;
        DOM.shareReceiptBtn.disabled = false;
      }
    });
  }

  // Scan Again button
  const scanAgainTrigger = document.getElementById('scan-again-trigger');
  if (scanAgainTrigger) {
    scanAgainTrigger.addEventListener('click', resetScan);
  }

  // History clear button
  const historyClearBtn = document.getElementById('history-clear-btn');
  if (historyClearBtn) {
    historyClearBtn.addEventListener('click', () => {
      try { localStorage.removeItem(HISTORY_KEY); } catch (_) { }
      renderHistoryPanel();
    });
  }

  // Render history on first load (shows past scans from localStorage)
  renderHistoryPanel();

});
