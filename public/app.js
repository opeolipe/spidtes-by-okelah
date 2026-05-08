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
  body:            document.body,

  // Meta bar (live data)
  ispDisplay:      document.getElementById('isp-display'),
  locationDisplay: document.getElementById('location-display'),
  ipDisplay:       document.getElementById('ip-display'),
  ipRevealBtn:     document.getElementById('ip-reveal-btn'),

  // Share buttons
  shareReceiptBtn: document.getElementById('share-receipt-btn'),

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
  isScanning:  false,
  scanCount:   0,          // Escalating roast intensity (persisted via localStorage)
  timers:      [],         // Held for potential cleanup
  locale:      'en-US',    // Set by detectLocale()
  networkData: null,       // Set by fetchNetworkData()
  roastText:   '',         // Set by generateRoast()
  isVpn:       false,      // Set by detectVpnMismatch()
  pingMs:      999,        // Set by measurePing()
  speedMbps:   0.1,        // Set by measureSpeed()
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

const API_URL     = 'https://ipapi.co/json/';
const SESSION_KEY = 'spidtes_network_cache';

/** Fallback data used when offline, ad-blocked, or timed out */
function getFallbackData(reason) {
  const isId = STATE.locale === 'id-ID';
  return {
    ip:          null,
    isp:         isId ? 'ISP Tidak Diketahui' : 'Unknown Provider',
    org:         '',
    city:        isId ? 'Entah Di Mana'       : 'Somewhere',
    region:      '',
    country:     isId ? 'Indonesia'            : 'Earth',
    countryCode: isId ? 'ID'                   : 'XX',
    latitude:    null,
    longitude:   null,
    _fallback:   true,
    _reason:     reason,   // 'offline' | 'adblocker' | 'timeout' | 'ratelimit'
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
  const timeoutId  = setTimeout(() => controller.abort(), 3000);

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
      ip:          String(raw.ip          || ''),
      isp:         String(raw.org         || raw.isp || ''),
      org:         String(raw.org         || ''),
      city:        String(raw.city        || ''),
      region:      String(raw.region      || ''),
      country:     String(raw.country_name|| ''),
      countryCode: String(raw.country_code|| '').toUpperCase(),
      latitude:    raw.latitude  || null,
      longitude:   raw.longitude || null,
      _fallback:   false,
      _reason:     null,
      _fetchedAt:  Date.now(),
    };

    // 6. Cache in sessionStorage
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (_) {}

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
    const tid  = setTimeout(() => ctrl.abort(), 5000);
    await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
      cache:  'no-store',
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
  // Fast path: Network Information API (Chrome/Android, no request needed)
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && conn.downlink > 0) {
    return Math.round(conn.downlink * 10) / 10;
  }

  // Helper: time a fetch and compute Mbps from bytes received
  async function timedDownload(url, timeoutMs) {
    const ctrl  = new AbortController();
    const tid   = setTimeout(() => ctrl.abort(), timeoutMs);
    const start = performance.now();
    const resp  = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    const buf   = await resp.arrayBuffer();
    clearTimeout(tid);
    const elapsed = (performance.now() - start) / 1000;
    const mbps    = (buf.byteLength * 8) / (elapsed * 1_000_000);
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


/* ============================================================
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

  // Flicker the speed number — register the interval so clearAllTimers() can stop it
  let flickerCount = 0;
  const flickerInterval = setInterval(() => {
    const noise = Math.round(Math.random() * 30 - 15);
    DOM.speedValue.textContent = Math.max(0, 82 + noise);
    flickerCount++;
    if (flickerCount >= 6) clearInterval(flickerInterval);
  }, 100);
  STATE.timers.push(flickerInterval);

  updateStatus('Hmm... something\'s not right.', 'Signal unstable.');
}

/* ── Phase 3: Crash ── */
function phase3_crash() {
  DOM.needleGroup.classList.remove('needle--stutter');
  DOM.needleGroup.classList.add('needle--crash');
  void DOM.needleGroup.getBoundingClientRect(); // reflow so crash transition is active

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
  schedule(() => DOM.speedometerSect.classList.remove('screen-shake'), 600);

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
  // Use real network data if available, otherwise use fallback
  const networkData = STATE.networkData || getFallbackData('not_fetched');
  const roastText   = generateRoast(networkData);

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

    // Restore state (scanning done)
    STATE.isScanning = false;
    removeScanningDots();
    DOM.body.classList.remove('is-scanning');
    updateConnectionPill('Scan Complete', 'done');
  }, 480);
}


/* ============================================================
   PHASE C — VPN MISMATCH DETECTION (global)
   ============================================================ */

/**
 * Maps a browser language prefix to the expected ISO-3166-1 alpha-2
 * country code(s) for that language's primary region(s).
 * A mismatch between browser language and the IP's country code
 * strongly suggests a VPN or proxy is active.
 */
const LOCALE_COUNTRY_MAP = {
  'id':  ['ID'],
  'ms':  ['MY', 'BN', 'SG'],
  'fil': ['PH'],
  'th':  ['TH'],
  'vi':  ['VN'],
  'km':  ['KH'],
  'my':  ['MM'],
  'lo':  ['LA'],
  'ja':  ['JP'],
  'ko':  ['KR'],
  'zh':  ['CN', 'TW', 'HK', 'MO', 'SG'],
  'de':  ['DE', 'AT', 'CH'],
  'fr':  ['FR', 'BE', 'CH', 'CA', 'LU'],
  'es':  ['ES', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'CR', 'GT', 'HN', 'SV', 'NI', 'PA', 'DO', 'CU'],
  'pt':  ['PT', 'BR', 'AO', 'MZ'],
  'ru':  ['RU', 'BY', 'KZ'],
  'uk':  ['UA'],
  'pl':  ['PL'],
  'cs':  ['CZ'],
  'sk':  ['SK'],
  'hu':  ['HU'],
  'ro':  ['RO'],
  'bg':  ['BG'],
  'hr':  ['HR'],
  'sr':  ['RS'],
  'sl':  ['SI'],
  'nl':  ['NL', 'BE'],
  'sv':  ['SE'],
  'da':  ['DK'],
  'fi':  ['FI'],
  'nb':  ['NO'],
  'nn':  ['NO'],
  'tr':  ['TR'],
  'ar':  ['SA', 'AE', 'EG', 'IQ', 'MA', 'DZ', 'TN', 'LY', 'JO', 'LB', 'SY', 'YE', 'OM', 'KW', 'QA', 'BH'],
  'fa':  ['IR', 'AF'],
  'he':  ['IL'],
  'hi':  ['IN'],
  'bn':  ['BD', 'IN'],
  'ta':  ['IN', 'LK'],
  'te':  ['IN'],
  'mr':  ['IN'],
  'ur':  ['PK', 'IN'],
  'el':  ['GR', 'CY'],
  'it':  ['IT', 'CH'],
  'lt':  ['LT'],
  'lv':  ['LV'],
  'et':  ['EE'],
  'ka':  ['GE'],
  'hy':  ['AM'],
  'az':  ['AZ'],
  'uz':  ['UZ'],
  'kk':  ['KZ'],
};

/**
 * detectLocaleFromNetwork(networkData)
 * Overrides the browser-language locale with one derived from the IP's country
 * code, so users who browse in English but are physically in Indonesia (etc.)
 * still receive localised roasts.
 */
const COUNTRY_LOCALE_MAP = {
  'ID': 'id-ID',
  'MY': 'id-ID', 'BN': 'id-ID',
};

function detectLocaleFromNetwork(networkData) {
  if (!networkData || networkData._fallback || !networkData.countryCode) return;
  const mapped = COUNTRY_LOCALE_MAP[networkData.countryCode];
  if (mapped) STATE.locale = mapped;
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
  const lang    = navigator.language.toLowerCase();
  const prefix  = lang.split('-')[0];
  const ipCode  = networkData.countryCode;

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

const ROAST_DICT = {
  'id-ID': {
    vpnRoast: [
      'Browser-mu Indo, IP-mu Amerika. Pake VPN gratisan ya bang? Kirain pro.',
      'Detected VPN. Sok internasional, padahal koneksinya tetep lemot.',
      'IP-mu abroad tapi ping-mu tetap nangis. VPN gratisan atau berbayar juga sama aja hasilnya.',
      'Pake VPN biar kelihatan keren. Speed-nya tetap bikin malu.',
      'VPN aktif, bandwidth tetap pingsan. Tunneling ke mana, bang?',
      'IP-mu keluar negeri tapi jiwa koneksinya masih di warnet pinggir jalan.',
      'Nyamar jadi bule di internet, tapi speed-nya masih ala kosan Rp800rb sebulan.',
      'VPN-nya bisa nyembunyiin lokasi. Nggak bisa nyembunyiin kenyataan ini.',
      'Encrypt traffic boleh. Tapi kekecewaan ini nggak bisa dienkripsi.',
      'Pakai VPN biar "aman". Aman dari siapa? Speed-mu tetap ketangkap basah.',
    ],
    pingReact: [
      'Ping-mu lebih tinggi dari harapan hidupmu.',
      'Dengan ping segitu, kamu udah kalah sebelum mulai.',
      'Ping {ping}ms? Paket internet-mu kayak kirim surat lewat kantor pos.',
      '{ping}ms. Itu bukan latency, itu penantian eksistensial.',
      'Ping {ping}ms bikin game online jadi catur pos.',
      'Dengan ping {ping}ms, musuh udah respawn sebelum peluru-mu nyampe.',
      'CS:GO, Valorant, PUBG — semua akan menolakmu dengan ping {ping}ms ini.',
      'Ping {ping}ms. HTTP request-mu udah pensiun sebelum nyampe server.',
      '{ping}ms latency. Live streaming? Lebih pas disebut delayed broadcast.',
      'Ping segitu bikin video call jadi pertunjukan seni patung.',
    ],
    speedReact: [
      'Speedmu {speed} Mbps. Siput pun ngakak.',
      '{speed} Mbps? Kamu mau streaming atau meditasi?',
      'Bahkan IndiHome promo pun malu liat angka ini.',
      '{speed} Mbps. WhatsApp voice note aja nge-buffer.',
      'Kecepatan {speed} Mbps. Kenangan masa lalu load lebih cepet.',
      'Netflix minimum 3 Mbps buat 720p. Kamu di {speed} Mbps. Selamat nonton slideshow.',
      'Zoom meeting dengan {speed} Mbps? Wajahmu bakal jadi karya seni piksel.',
      '{speed} Mbps di 2025. Warnet tahun 2005 lebih kenceng dari ini.',
      'Download file 100MB dengan {speed} Mbps? Siapkan bekal makan siang.',
      'Angka {speed} Mbps ini bikin tetangga yang pake HP hotspot ikut kasihan.',
    ],
    ispRoast: {
      'indihome':   [
        'IndiHome, raja throttling nusantara. Mahal, lambat, tapi tetep dipake karena ga ada pilihan.',
        'IndiHome: karena monopoli itu nyata, dan kamu yang bayar ongkosnya.',
        'IndiHome FUP-nya kejam. Tanggal 20 speed langsung nyungsep ke dasar laut.',
        'Tagihan IndiHome naik tiap tahun. Speed-nya setia di angka yang sama.',
        'IndiHome: satu-satunya tempat di mana "gangguan jaringan" adalah fitur, bukan bug.',
      ],
      'telkomsel':  [
        'Telkomsel Orbit katanya solusi rumahan. Solusi apa, bro? Solusi bikin emosi.',
        'Orbit by Telkomsel: harga langit, speed tanah.',
        'Telkomsel: provider terbesar Indonesia, dengan keluhan terbesar juga.',
        'Orbit sudah orbit ke mana-mana, tapi signal-nya masih di bumi bawah.',
      ],
      'biznet':     [
        'Biznet harusnya kenceng. Harusnya. Kenyataannya? Ya gini deh.',
        'Biznet di kertasnya 100Mbps. Di realitanya tanya tetangga yang sama kecewanya.',
        'Biznet Metro: metronya macet juga rupanya.',
        'Biznet fiber optik katanya. Fiber-nya mungkin masih digulung di gudang.',
      ],
      'xl':         [
        'XL Axiata. X-nya buat X-tras lambat.',
        'XL: Xtra Lemot, eXtra kecewa.',
        'XL Satu Home — satu paket, satu kekecewaan terpadu.',
        'XL fiber sudah ada. Kamu pake XL yang mana, bang? Yang lemot juga?',
      ],
      'myrepublic': [
        'MyRepublic katanya gaming ISP. Gaming ISP buat gamer yang hobi DC.',
        'MyRepublic: republiknya mana? Yang ini kayak monarki disconnect.',
        'MyRepublic fiber gaming — gaming paling mulus adalah saat server down.',
      ],
      'smartfren':  [
        'Smartfren. Smart dari mana? Dari namanya doang.',
        'Smartfren: sinyal 4G, kecepatan nostalgia 2G.',
        'Smartfren WMS home broadband. W-nya untuk Waiting.',
        'Smartfren: satu-satunya provider yang bikin pengguna merasa lebih pintar setelah berhenti langganan.',
      ],
      'first media':['First Media: first dalam harga, last dalam performa.', 'First Media fiber — first kali konek kenceng, abis itu silakan bersabar.'],
      'iconnet':    ['IconNet by PLN. Listrik bisa, internet... ya masih sesuai anggaran PLN.', 'IconNet: icon-nya bisa, net-nya masih loading.', 'PLN masuk bisnis internet. Mati lampu masuk bundel gratis.'],
      'mnc':        ['MNC Play. Main streaming di platform sendiri aja buffering, gimana yang lain.', 'MNC Play — media terbesar, bandwidth terkecil.'],
      'tri':        ['Tri/3 Hutchison. Nomor tiga dalam nama, nomor tiga dari bawah dalam kecepatan.', '3 Indonesia: unlimited data, unlimited kekecewaan.'],
      'axis':       ['Axis Telekom. Udah merger sama XL, speed-nya pun ikut merge jadi satu: lambat.', 'Axis: dulu murah meriah, sekarang... tetap saja.'],
      'isat':       ['Indosat Ooredoo Hutchison. Tiga perusahaan bergabung, speed-nya tetap satu: biasa aja.', 'IM3 Ooredoo: rebranding keren, kecepatan original tetap terjaga.'],
      'telkom':     ['Telkom Indonesia, BUMN kebanggaan bangsa. Bangga-banggain yang lain aja deh.', 'Astinet Telkom: harganya enterprise, feeling-nya warnet.'],
      'orbit':      ['Telkomsel Orbit: bayar premium, dapat koneksi yang bikin melow.', 'Orbit Home: harga bintang lima, speed bintang satu.'],
      'default':    [
        'ISP "{isp}"? Baru denger. Kayaknya RT/RW Net patungan se-kosan ya?',
        'Provider "{isp}" ini nggak masuk radar, tapi koneksinya udah cukup buat ngomong sendiri.',
        '"{isp}" — nama baru, kekecewaan klasik.',
        'Belum pernah denger "{isp}", tapi dari hasil ini, udah bisa ditebak ceritanya.',
        '"{isp}" ini apa singkatannya? Internet Sangat Tidak Enak?',
      ],
    },
    locationRoast: {
      'denpasar': [
        'Denpasar, ibu kota Bali. Kota seni dan budaya. Internet-nya? Beda cerita.',
        'Digital nomad masuk Denpasar pake WiFi kosan Rp150rb. Vibes bagus, koneksi nangis.',
        'Denpasar — turis datang buat sunset. Kamu duduk nungguin halaman web yang load.',
      ],
      'bali':     [
        'Work From Bali tapi WiFi kosan Rp150rb sebulan. Vibes bagus, koneksi ngenes.',
        'Digital nomad di Bali pake WiFi warung. Respek tapi ya... upload foto aja pake jalur darat.',
        'Bali surganya dunia. WiFi-nya surganya disconnected.',
        'Semua orang WFB — Work From Bali. Tapi yang "B" itu Buffer, bukan Beach.',
      ],
      'dalung':   [
        'Dalung, Bali. Kosan WiFi patungan 6 orang. Speed dibagi rata: nol koma nol.',
        'Dalung: harga kosan naik, speed WiFi tetap di titik yang sama sejak 2017.',
      ],
      'kuta':     ['Kuta, pantai paling rame di Bali. WiFi paling rame buffering-nya juga.', 'Kuta — turis ribuan, bandwidth ratusan kilobyte.'],
      'seminyak': ['Seminyak, area bule sultan. Internet-nya masih ala Bali pada umumnya: bisa nunggu.'],
      'ubud':     ['Ubud, pusat seni dan spiritualitas. Internet-nya menguji kesabaran spiritual kamu.', 'Ubud: cocok buat healing, cocok juga buat detoks digital — karena internet-nya bikin kapok.'],
      'jakarta':  [
        'Jakarta, ibu kota, tapi koneksinya masih kalah sama warnet 2008.',
        'DKI Jakarta: macetnya di jalan, macetnya di internet.',
        'Jakarta pusat ekonomi Indonesia. Ekonomi internet-mu? Jauh dari pusat.',
        'Tinggal di kota yang tidak pernah tidur, internet-mu yang malah tidur duluan.',
      ],
      'surabaya': [
        'Surabaya, kota pahlawan. Pahlawan yang ping-nya 300ms.',
        'Surabaya kota terbesar kedua. Internet-nya? Juga nomor dua. Dari bawah.',
        'Arek Suroboyo biasanya keras kepala. Internet-nya lebih keras: keras susah konek.',
      ],
      'bandung':  [
        'Bandung kota kembang. Kembang kembali jadi dial-up ternyata.',
        'Silicon Valley-nya Indonesia katanya. Silicon iya, Valley speed-nya iya juga — turun terus.',
        'Bandung: startup-nya kenceng, internet rumahnya masih mengejar.',
      ],
      'yogyakarta': [
        'Jogja istimewa katanya. Istimewa lemotnya iya.',
        'Kota pelajar, tapi internet-nya bikin ilmu susah masuk.',
        'Malioboro ramai wisatawan. Router-mu juga ramai — ramai error.',
      ],
      'semarang': [
        'Semarang, kota lumpia. Internet-nya pun selembek lumpia basah.',
        'Semarang: Rob air laut naik tiap tahun. Kecepatan internet turun tiap bulan.',
        'Kota atlas ini bisa ngangkat banyak hal. Internet kenceng belum termasuk.',
      ],
      'medan':    [
        'Medan, kota terbesar di Sumatra. Internet-nya masih kalah sama warung kopi di Jawa.',
        'Orang Medan terkenal keras dan tegas. Coba tegas ke ISP-mu juga dong.',
        'Medan: kota sejuta durian, satu internet yang mengecewakan.',
      ],
      'makassar': [
        'Makassar, gerbang timur Indonesia. Gerbangnya buka, internet-nya masih tutup.',
        'Kota Daeng ini terkenal pemberani. Berani juga ya pake internet segini.',
        'Makassar punya bandara baru megah. Terminal internet-nya masih dalam renovasi.',
      ],
      'malang':   [
        'Malang kota dingin dan sejuk. Koneksi internet-nya pun bikin hati dingin.',
        'Malang: kota apel dan pendidikan. Internet-nya bikin studi kasus sendiri.',
        'Kota Malang — nama kotanya tepat buat kondisi koneksi internet-mu.',
      ],
      'bogor':    [
        'Bogor, kota hujan. Yang jelas bukan hujan bandwidth.',
        'Istana Bogor ada di sini. Istana ISP-mu? Sudah lama ambruk.',
        'Bogor satu jam dari Jakarta. Speed internet-nya satu dekade dari normal.',
      ],
      'depok':    [
        'Depok. UI dan Gunadarma ada di sini. Ironi internet-nya sangat nyata.',
        'Kota satelit Jakarta ini punya banyak mahasiswa IT. Mereka semua ngerasain pedihnya internet-mu.',
        'Depok: smart city in progress. Progress-nya lagi istirahat rupanya.',
      ],
      'tangerang': [
        'Tangerang, kota industri di pintu masuk Jakarta. Industri apa? Industri lemot.',
        'BSD City ada di Tangerang. Kota baru, internet lama.',
        'Tangerang Selatan: kawasan elite, internet masih demokratis — lambat merata.',
      ],
      'bekasi':   [
        'Bekasi. Udah jauh dari Jakarta, jauh juga dari kecepatan internet yang manusiawi.',
        'Orang Bekasi sering diledekin. Sekarang internet-nya ikut nimbrung.',
        'Bekasi: kemacetan kelas dunia, internet kelas RT/RW.',
      ],
      'palembang': [
        'Palembang, kota pempek. Internet-nya pun sama ngembangnya — penuh harapan, kurang eksekusi.',
        'Jembatan Ampera ikonik banget. Koneksi internet-mu juga ikonik: ikonik lemotnya.',
      ],
      'pekanbaru': [
        'Pekanbaru, kota minyak. Minyak banyak, bandwidth nggak ikut.',
        'Pekanbaru: SDA melimpah, SDM berkualitas. Internet-nya masih dalam pengembangan.',
      ],
      'balikpapan': [
        'Balikpapan, gerbang IKN. Ibukota baru mau dibangun, internet lama masih di sana.',
        'Kota minyak Kaltim ini siap masa depan. Internet-nya masih di masa lalu.',
      ],
      'pontianak': [
        'Pontianak, tepat di garis khatulistiwa. Sinyal-nya bingung mau ke utara atau selatan.',
        'Kota khatulistiwa ini punya posisi unik di peta. Internet-nya punya posisi unik juga: di bawah ekspektasi.',
      ],
      'manado':   [
        'Manado, ujung utara Sulawesi. Signal-nya juga nyungsep ke arah utara.',
        'Bunaken terdekat dari sini. Sayangnya bandwidth-mu udah tenggelam lebih dalam.',
      ],
      'lombok':   [
        'Lombok, surga wisata. Wisatawan datang, internet kabur ke gunung Rinjani.',
        'Pantai-pantai Lombok menakjubkan. WiFi-nya bikin takjub juga — takjub betapa lemotnya.',
      ],
      'default':  [
        'Dimanapun kamu berada, satu hal yang pasti: ISP-mu mengecewakan.',
        'Kota-mu nggak ada di daftar, tapi internet segini mah bikin tetangga kasihan.',
        'Lokasi nggak dikenal, tapi kualitas internet-nya sangat dikenali: mengecewakan.',
        'Entah di mana kamu berada, ISP-mu sudah menemukan cara untuk kecewain kamu di sana.',
        'Nama kota-mu nggak ada, tapi rekam jejaknya ada: lambat.',
      ],
    },
    punchline: [
      'Semoga ISP-mu segera sadar diri.',
      'Hubungi customer service ISP-mu. Nanti deh, masih antri 3 jam.',
      'Ganti ISP atau ganti harapan. Dua-duanya valid.',
      'Coba restart router. Ga bakal ngaruh, tapi setidaknya ada usaha.',
      'Screenshot ini dan kirimin ke CS ISP-mu. Tanda kenangan.',
      'Upgrade paket internet-mu. Atau upgrade kesabaran-mu. Pilih salah satu.',
      'ISP-mu kayak mantan: janji manis, realitanya menghancurkan.',
      'Pro tip: matiin WiFi, pake data. Hasilnya? Tetap sama. Selamat.',
      'Kirim hasil ini ke grup keluarga. Biar ada yang sibuk ngurus internet kamu.',
      'Grafik speed-mu kayak grafik semangat hari Senin pagi: langsung turun.',
      'Buka tiket keluhan ke ISP-mu. Mereka akan bilang "sedang diperbaiki" seperti biasa.',
      'Sebenernya, warnet terdekat mungkin lebih kenceng. Pertimbangkan opsi itu.',
      'Ping-mu lebih tinggi dari ekspektasi, speed-mu lebih rendah dari harga paket.',
      'Coba ganti posisi router. Tetap nggak akan ngaruh, tapi lumayan buat olahraga.',
      'Lapor ke BRTI kalau mau. Antrinya lebih lama dari loading halaman web-mu.',
    ],
  },

  'en-US': {
    vpnRoast: [
      'VPN detected. Hiding from your ISP, or just from the truth about your speeds?',
      'Nice VPN. Still slow though.',
      'Browser says one country. IP says another. The VPN is not helping your ping.',
      'Using a VPN to look more international? Cute. The lag is very local.',
      'Your browser and your IP are having an argument about where you actually live.',
      'Pro-tier privacy setup. Zero-tier connection speed.',
      'Encrypted traffic, unencrypted disappointment.',
      'You tunneled through a VPN to arrive at the same slow destination.',
      'The VPN hides your location. Nothing hides these speeds.',
      'VPN on. Ping through the roof. At least your data is secure — it\'s just not going anywhere fast.',
      'Privacy mode: enabled. Speed: also private, apparently hidden from everyone.',
      'Routing through three countries to arrive at dial-up territory.',
    ],
    pingReact: [
      'A ping of {ping}ms. Were you testing from the moon?',
      '{ping}ms latency. Online gaming? More like online suffering.',
      'Your ping is so high it needs its own postcode.',
      '{ping}ms. Your packets are scenic-routing through the past.',
      'Ping {ping}ms — that\'s not a number, that\'s a cry for help.',
      'With {ping}ms, your "real-time" connection is more of a "remember when" situation.',
      'Somewhere, a dial-up modem is feeling smug about your {ping}ms ping.',
      '{ping}ms latency. Video calls must look like interpretive mime performances.',
      'At {ping}ms you\'re not playing online games. You\'re submitting predictions.',
      'Ping {ping}ms. The internet received your request and is thinking about whether to respond.',
      'Your ISP charged you for speed and delivered archaeology. {ping}ms is a timestamp, not a ping.',
    ],
    speedReact: [
      '{speed} Mbps. My grandmother streams faster on carrier pigeon.',
      'Congrats on {speed} Mbps. That\'s... technically a number.',
      'At {speed} Mbps, a YouTube thumbnail takes a lunch break to load.',
      '{speed} Mbps is not a speed test result. That\'s a hostage note.',
      'At {speed} Mbps you\'re not browsing the web. You\'re petitioning it.',
      'NASA communicates with the Voyager probe at the edge of the solar system faster than {speed} Mbps.',
      'Your {speed} Mbps connection speed is what engineers technically classify as "nothing."',
      'A smart toaster running {speed} Mbps would file a complaint.',
      '{speed} Mbps. Even your browser\'s loading spinner is confused.',
      'With {speed} Mbps, streaming 4K would require a time machine.',
      'The fax machine your ISP is clearly using could explain the {speed} Mbps you\'re seeing.',
      '{speed} Mbps. You could out-download this by waving two tin cans on a string.',
    ],
    ispRoast: {
      'comcast':   [
        'Comcast: because you deserve to pay premium prices for mediocre service.',
        'Comcast Xfinity: infinity waits, finite speed.',
        'Comcast has been America\'s most hated company multiple years running. This result explains why.',
        'Xfinity: X marks the spot where your bandwidth went missing.',
      ],
      'at&t':      [
        'AT&T: Attempted Terrible Throughput.',
        'AT&T fiber? More like AT&T fi-blur.',
        'AT&T FirstNet: first in name, last in delivery.',
        'AT&T has been building fiber for 20 years. The truck never came to your street.',
      ],
      'starlink':  [
        'Starlink — technology from space, latency still from Earth.',
        'Elon sent satellites to orbit. Your ping is still in geostationary.',
        'Starlink: revolutionary concept, weather-dependent execution.',
        'You paid for a satellite dish and got satellite speeds from 2003.',
      ],
      'spectrum':  [
        'Spectrum: the full spectrum of disappointment.',
        'Spectrum promises fast internet. Must be a different spectrum.',
        'Charter Spectrum — monopoly pricing, municipal pool speeds.',
        'Spectrum has no data caps, which is generous since there\'s barely any data to cap.',
      ],
      'verizon':   [
        'Verizon Fios: Fi-os as in "finally, oh slow."',
        'Can you hear me now? Verizon can. Your packets? Not so much.',
        'Verizon 5G Home: 5G in the name, 3G in the delivery.',
        'Verizon\'s marketing budget is larger than your actual connection speed.',
      ],
      'cox':       [
        'Cox Communications. The name says it all, really.',
        'Cox: gigabit available in select areas. Your area selected "no."',
        'Cox Panoramic WiFi — panoramic view of all the buffering.',
      ],
      'virgin':    [
        'Virgin Media: still virgin to the concept of consistent speeds.',
        'Virgin Media — Richard Branson went to space. Your connection never left the ground floor.',
        'Virgin Media\'s speeds are measured in "up to." You got the "down from."',
      ],
      'bt':        [
        'BT Broadband: British Throttling, as per tradition.',
        'BT Openreach — open to disappointment, closed to improvement.',
        'BT Full Fibre? Full of something, certainly.',
        'BT has been the UK\'s internet backbone since the 80s. It shows.',
      ],
      'sky':       [
        'Sky Broadband — blue sky thinking, grey sky delivering.',
        'Sky: limitless above you, limited bandwidth below.',
        'Sky Ultrafast. Ultra is doing a lot of work in that name.',
      ],
      'talktalk':  [
        'TalkTalk. At least you can still talk. The internet\'s done.',
        'TalkTalk: they got hacked so badly they had to rebrand twice. The speeds stayed the same.',
        'TalkTalk — Britain\'s most famous budget ISP. Budget quality included.',
      ],
      'ee':        [
        'EE — everything\'s expensive, everything\'s eventually slow.',
        'EE Full Fibre. Full of something. Not bandwidth.',
        'EE acquired by BT. British tradition of underdelivering: maintained.',
      ],
      'vodafone':  [
        'Vodafone — connecting people. Eventually. Maybe.',
        'Vodafone broadband: they do it better in some countries. This isn\'t one of them.',
        'Vodafone: global presence, local letdown.',
      ],
      'plusnet':   [
        'Plusnet — Yorkshire\'s finest disappointment, delivered with a friendly voice.',
        'Plusnet: "doing you proud" is aspirational, apparently.',
        'Plusnet: budget tier. You got the budget experience.',
      ],
      'telstra':   [
        'Telstra — Australia\'s biggest ISP with Australia\'s biggest audacity.',
        'Telstra charges the most and delivers the least. Australian tradition.',
        'Telstra HFC: the H stands for Hoping it works.',
      ],
      'optus':     [
        'Optus. Even their outages have outages.',
        'Optus had a national outage that left 10 million offline. Your connection is its own private tribute.',
        'Optus: second place in the Australian duopoly, first place in apologies.',
      ],
      'rogers':    [
        'Rogers Canada — monopoly pricing, municipal pool speeds.',
        'Rogers, Bell, or Telus. Doesn\'t matter which — same cartel, same sadness.',
        'Rogers: Canada\'s most complained-about ISP. Consistent at something, at least.',
      ],
      'bell':      [
        'Bell Canada — ring ring, still buffering.',
        'Bell Fibe: the "e" stands for "eventually."',
        'Bell has been Canada\'s backbone since 1880. Still operating on original infrastructure, it seems.',
      ],
      'bsnl':      [
        'BSNL — government-owned, government-paced.',
        'BSNL Bharat Fiber: the bharat is fast, the fiber is theoretical.',
        'BSNL: where technology goes to retire.',
      ],
      'jio':       [
        'Jio disrupted the Indian market. Now the market is disrupted, and so is your connection.',
        'Jio: unlimited data, limited usefulness.',
        'Jio True 5G — 5G towers visible, 5G speed optional.',
      ],
      'pldt':      [
        'PLDT — Philippines\' finest exercise in managed expectations.',
        'PLDT: monopoly of a different kind. The kind where you pay more and get less.',
        'PLDT Fibr: the "r" replaced the "e" in "fiber." The speed replaced nothing.',
      ],
      'globe':     [
        'Globe Telecom — the world is waiting. Apparently so is your data.',
        'Globe At Home: at home with buffering.',
        'Globe and PLDT. One ISP or two? Doesn\'t matter — same result.',
      ],
      'singtel':   [
        'Singtel in Singapore should be the gold standard. How did you end up with tin?',
        'Singapore has some of the fastest internet on Earth. You found the one dead zone.',
      ],
      'tmobile':   [
        'T-Mobile Home Internet: magenta packaging, beige performance.',
        'T-Mobile merged with Sprint to become one. Unfortunately one disappointment.',
        'Un-carrier? More like un-fast.',
      ],
      'xfinity':   [
        'Xfinity — infinite potential, finite delivery.',
        'Xfinity Gigabit: the gigabit is theoretical. This result is very real.',
        'Comcast rebranded to Xfinity to escape its reputation. The speeds came along anyway.',
      ],
      'mediacom':  ['Mediacom: serving rural America with urban prices and rural speeds.', 'Mediacom — monopoly ISP for areas that deserve better.'],
      'frontier':  ['Frontier Communications: on the frontier of slow.', 'Frontier fiber — frontier as in the lawless past where speeds roamed free and low.'],
      'centurylink':['CenturyLink, now Lumen. New name. Century-old speeds.', 'Lumen Technologies: illuminating how bad your internet can be.'],
      'optimum':   ['Optimum — optimistic name, pessimistic outcome.', 'Altice Optimum: they bought the company. Didn\'t buy faster infrastructure.'],
      'default':   [
        '"{isp}" — never heard of them, but based on these results, I\'m not surprised.',
        '"{isp}" — obscure ISP, iconic disappointment.',
        '"{isp}" — they exist. That\'s the nicest thing we can say right now.',
        'Never heard of "{isp}," but the speed test results are a thorough introduction.',
        '"{isp}" sounds made up. The speeds confirm it.',
      ],
    },
    locationRoast: {
      'california': [
        'Silicon Valley adjacent, but your speeds are still in the valley — the bad one.',
        'California, home of every major tech company on Earth. Their offices have better WiFi than you.',
        'LA traffic is legendary. So is your latency, apparently.',
        'San Francisco: $4,000/month rent, ISP still can\'t deliver gigabit to your door.',
      ],
      'new york':  [
        'New York City. Fastest city in the world. Slowest Wi-Fi in the building.',
        'New York: everyone\'s in a rush. Your packets are not.',
        'Times Square has more bandwidth per square meter than your entire apartment.',
        'NYC — the city that never sleeps. Your connection already is.',
      ],
      'london':    [
        'London: world-class city, Victorian-era broadband.',
        'London has Openreach on every street. Still somehow ended up with this.',
        'City of London moves trillions a day. Your connection moves kilobytes.',
        'London calling. Nobody answered — the bandwidth was too low.',
      ],
      'sydney':    [
        'Australia: beautiful country, geographically cursed internet infrastructure.',
        'Sydney is a global financial hub. The NBN has not received the memo.',
        'Bondi Beach is stunning. Your download speeds are not.',
        'Australia spent billions on the NBN to deliver this. Impressive, in a way.',
      ],
      'melbourne': [
        'Melbourne: world\'s most livable city, four years running. Internet livability: pending.',
        'Melbourne\'s coffee is world class. The NBN speeds are decidedly not.',
        'AFL fans stream matches all weekend. Must be on a different ISP than you.',
      ],
      'singapore': [
        'Singapore has some of the best internet in Asia. You are the exception.',
        'Singapore ranks top 5 globally for internet speed. Top 5 from the bottom, in your case.',
        'Changi Airport has better free WiFi than what you\'re paying for.',
      ],
      'tokyo':     [
        'Tokyo has gigabit fiber on every corner. You found the one exception.',
        'Japan invented the bullet train. Your data is taking the scenic local route.',
        'Tokyo: anime streams at 8K nationwide. You\'re buffering at 480p.',
      ],
      'seoul':     [
        'South Korea averages some of the fastest internet on the planet. This is not that.',
        'Seoul: 10Gbps fiber is practically standard. You\'re experiencing the other standard.',
        'K-dramas are made in Seoul and stream flawlessly everywhere except here, apparently.',
      ],
      'mumbai':    [
        'Mumbai: financial capital of India, Bollywood HQ, internet of a 90s cyber cafe.',
        'Mumbai doesn\'t sleep. Your connection apparently does.',
        'Dharavi is one of the most connected communities in Asia. Check your router.',
      ],
      'dubai':     [
        'Dubai built artificial islands in the ocean. They still can\'t build stable internet for you.',
        'Dubai: Burj Khalifa pierces the clouds. Your speeds are firmly underground.',
        'Everything in Dubai is luxury. Your ISP missed the memo.',
      ],
      'toronto':   [
        'Toronto: world-class city, Rogers-Bell duopoly, cartel-tier pricing for these speeds.',
        'Canada has some of the most expensive internet in the developed world. You\'re experiencing why.',
        'Toronto Film Festival, Raptors, maple syrup. Great city. Terrible ISP market.',
      ],
      'berlin':    [
        'Berlin: capital of countercultural freedom. Imprisoned by Deutsche Telekom.',
        'Berlin\'s start-up scene is one of Europe\'s best. They all have better WiFi than this.',
        'Berliners survived a lot. This connection is a new test of endurance.',
      ],
      'paris':     [
        'Paris: city of light. Your latency is illuminating something different.',
        'Paris has some of Europe\'s best fiber infrastructure. Someone forgot to connect your building.',
        'Café WiFi in Paris is better than this. And it\'s free with a coffee.',
      ],
      'amsterdam': [
        'Amsterdam: best internet infrastructure in Europe. You got the canal houseboat exception.',
        'AMS-IX is one of the world\'s largest internet exchanges and it\'s literally there. Somehow.',
        'Amsterdam: liberal, progressive, fast on everything except your connection.',
      ],
      'manila':    [
        'Manila: PLDT and Globe in a race to the bottom. Congrats, you\'re at the finish line.',
        'Philippines consistently ranks among the slowest internet in Asia. You\'re leading the statistic.',
        'Manila: 14 million people, 2 ISPs, somehow not enough bandwidth for either.',
      ],
      'bangkok':   [
        'Bangkok: tech hub of Southeast Asia. Today is not a tech day for you.',
        'Thailand has invested heavily in digital infrastructure. The return on investment hasn\'t reached you.',
        'Bangkok traffic is legendary. Your packets are stuck in it too, apparently.',
      ],
      'kuala lumpur': [
        'KL: Smart City initiative, Vision 2030, MSC Malaysia. Your ISP: vision 2003.',
        'KLCC towers are icons of modernity. Your connection is an icon of the past.',
        'Kuala Lumpur: everything going up. Bandwidth going nowhere.',
      ],
      'auckland':  [
        'Auckland: technically in the future time zone. Internet still stuck in the past.',
        'New Zealand has beautiful landscapes and challenging internet geography. You\'re experiencing both.',
        'Hobbiton is nearby. Your bandwidth belongs in the Shire.',
      ],
      'nairobi':   [
        'Nairobi: M-Pesa invented mobile banking here. Mobile internet still catching up.',
        'Silicon Savannah is in Nairobi. The savannah part applies to your speeds too.',
      ],
      'lagos':     [
        'Lagos: 20 million people, entrepreneurial capital of Africa, bandwidth still an aspiration.',
        'Lagos doesn\'t stop. Your packets have stopped for a rest.',
      ],
      'cairo':     ['Cairo: built the pyramids, invented writing. ISP still figuring out fiber.', 'Nile river has flowed for millennia. Your data flow is considerably less impressive.'],
      'default':   [
        'Wherever you are, your ISP has clearly never been there.',
        'Location unknown, disappointment universal.',
        'We couldn\'t find your city. Your ISP couldn\'t find adequate bandwidth either.',
        'Unknown location, known outcome: your ISP let you down regardless.',
        'Geography is a mystery. The low speeds are not.',
      ],
    },
    punchline: [
      'Have you tried turning your ISP off and not turning it back on?',
      'File a complaint. They won\'t fix it, but at least you\'ll feel something.',
      'Consider a career in interpretive dance. Your data packets already are.',
      'Restart your router. It won\'t help. But hope is free.',
      'Screenshot this. Frame it. A monument to your ISP\'s audacity.',
      'Your ISP\'s SLA says "up to" X Mbps. You\'re experiencing "as low as."',
      'Call your ISP. Hold music included at no extra charge. You\'ll be there a while.',
      'On the bright side, slow internet builds character. You must be very characterful by now.',
      'Your router is innocent. Your ISP is guilty. The router has suffered enough.',
      'At these speeds, buffering is just the algorithm asking you to go touch grass.',
      'Remember dial-up? This is approaching it. Take a moment with that.',
      'This speed test qualifies as modern art. Hang it up. Put it in a gallery.',
      'Your ISP promised the world. They delivered a small, slow part of it.',
      'Cancel your subscription. Re-subscribe as a new customer for the promo rate. It\'s the only winning move.',
      'Lodge a complaint with your telecom regulator. It won\'t help, but the data point matters.',
    ],
  },
};

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
  const dict   = ROAST_DICT[locale] || ROAST_DICT['en-US'];
  const parts  = [];

  const speed = STATE.speedMbps;
  const ping  = STATE.pingMs;
  const grade = calculateGrade(speed, ping);

  // 1. VPN override prefix
  if (STATE.isVpn) {
    parts.push(pick(dict.vpnRoast));
  }

  // 2. React to the worst metric; for grade F always roast both ping AND speed
  const speedBad = speed < 10;
  const pingBad  = ping  > 100;
  const sub = (line) => line.replace('{ping}', ping).replace('{speed}', speed);

  if (grade === 'F') {
    // Both are terrible — hit them with both barrels
    parts.push(sub(pick(dict.speedReact)));
    parts.push(sub(pick(dict.pingReact)));
  } else if (speedBad && !pingBad) {
    parts.push(sub(pick(dict.speedReact)));
  } else if (pingBad && !speedBad) {
    parts.push(sub(pick(dict.pingReact)));
  } else {
    // Pick whichever makes for a better roast (alternate for variety)
    parts.push(sub(pick(STATE.scanCount % 2 === 0 ? dict.pingReact : dict.speedReact)));
  }

  // 3. ISP roast — fuzzy match against dict keys
  const ispLower = (networkData.isp || '').toLowerCase();
  let ispLine = null;
  for (const [key, lines] of Object.entries(dict.ispRoast)) {
    if (key !== 'default' && ispLower.includes(key)) {
      ispLine = pick(lines).replace('{isp}', networkData.isp);
      break;
    }
  }
  if (!ispLine) {
    ispLine = pick(dict.ispRoast.default).replace('{isp}', networkData.isp || '???');
  }
  parts.push(ispLine);

  // 4. Location roast — fuzzy match on city
  const cityLower = (networkData.city || '').toLowerCase();
  let locLine = null;
  for (const [key, lines] of Object.entries(dict.locationRoast)) {
    if (key !== 'default' && cityLower.includes(key)) {
      locLine = pick(lines);
      break;
    }
  }
  if (!locLine) locLine = pick(dict.locationRoast.default);
  parts.push(locLine);

  // 5. Punchline
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
  // IPv4: 1.2.3.4 → 1.2.***.***
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    return ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***');
  }
  // IPv6: mask last 2 groups
  const parts = ip.split(':');
  if (parts.length >= 4) {
    parts[parts.length - 1] = '****';
    parts[parts.length - 2] = '****';
    return parts.join(':');
  }
  return ip.slice(0, 6) + '...';
}

/**
 * calculateGrade(speedMbps, pingMs)
 * Returns letter grade A–F based on speed + ping thresholds.
 */
function calculateGrade(speedMbps, pingMs) {
  if (speedMbps > 50 && pingMs < 30)  return 'A';
  if (speedMbps > 20 && pingMs < 60)  return 'B';
  if (speedMbps > 10 && pingMs < 100) return 'C';
  if (speedMbps > 5  && pingMs < 200) return 'D';
  return 'F';
}

/**
 * injectReceiptData(networkData, roastText)
 * Populates ALL receipt fields via textContent only (XSS-safe).
 * Also updates the live meta bar in the header.
 */
function injectReceiptData(networkData, roastText) {
  const speed = STATE.speedMbps;
  const ping  = STATE.pingMs;
  const grade = calculateGrade(speed, ping);
  const location = [networkData.city, networkData.country].filter(Boolean).join(', ') || '—';

  // ── Meta bar (live header) ── textContent only
  if (DOM.ispDisplay)      DOM.ispDisplay.textContent      = networkData.isp      || '—';
  if (DOM.locationDisplay) DOM.locationDisplay.textContent = location;
  // Partial mask: first 2 octets visible, last 2 redacted — more readable than full *** mask
  if (DOM.ipDisplay)       DOM.ipDisplay.textContent       = maskIp(networkData.ip);

  // ── On-Screen Results (Desktop UI) ──
  if (DOM.resultDlVal)     DOM.resultDlVal.textContent     = speed;
  if (DOM.resultPingVal)   DOM.resultPingVal.textContent   = ping;
  if (DOM.resultGradeVal)  DOM.resultGradeVal.textContent  = ''; // grade shown in icon only (see below)

  const roastTextEl = document.getElementById('roast-text');
  if (roastTextEl) roastTextEl.textContent = roastText;

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
  DOM.receiptSpeedVal.textContent  = speed;
  DOM.receiptPingVal.textContent   = `${ping} ms`;
  DOM.receiptGradeVal.textContent  = grade;
  DOM.receiptIsp.textContent       = networkData.isp      || '—';
  DOM.receiptLocation.textContent  = location;
  DOM.receiptIp.textContent        = maskIp(networkData.ip);
  DOM.receiptLatency.textContent   = `${ping} ms`;
  DOM.receiptConn.textContent      = networkData._fallback
    ? `Fallback (${networkData._reason})`
    : (networkData.org || networkData.isp || '—');
  DOM.receiptVpn.textContent       = STATE.isVpn ? 'Yes 🔒' : 'No';
  DOM.receiptRoast.textContent     = roastText;

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
  DOM.pingValue.textContent  = '-- ms';

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
  const dot   = pill.querySelector('.pulse-dot');
  const text  = pill.querySelector('.pill-label');
  if (text) text.textContent = label;
  if (dot) {
    dot.style.background = state === 'scanning' ? 'var(--accent-warm)'
                         : state === 'done'     ? 'var(--accent-cyan)'
                         : 'var(--accent-green)'; // idle
  }
}


/* ============================================================
   ENTRY POINT
   ============================================================ */
async function startScan() {
  // Guard: prevent double-clicks
  if (STATE.isScanning) return;

  STATE.isScanning  = true;
  STATE.scanCount++;
  STATE.pingMs      = 999;   // reset so stale values from previous scan don't bleed in
  STATE.speedMbps   = 0.1;
  STATE.networkData = null;
  STATE.isVpn       = false;
  try { localStorage.setItem('spidtes_scan_count', STATE.scanCount); } catch (_) {}

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

  measurePing().then((ms)   => { STATE.pingMs    = ms;    }).catch(() => {});
  measureSpeed().then((mbps) => { STATE.speedMbps = mbps; }).catch(() => {});

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
  } catch (_) {}

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
      if (!window.html2canvas) {
        alert('Export library is still loading. Please wait a moment and try again.');
        return;
      }

      const receiptEl = document.getElementById('cyber-receipt');
      if (!receiptEl) return;

      // Show loading state
      const origHTML = DOM.shareReceiptBtn.innerHTML;
      DOM.shareReceiptBtn.innerHTML = '<span aria-hidden="true">⏳</span> Generating...';
      DOM.shareReceiptBtn.disabled = true;

      // html2canvas cannot render an element whose ancestor is at top:-9999px.
      // Temporarily move the stage to the origin (hidden behind page with z-index:-1
      // and visibility:hidden so the user never sees it) then restore after capture.
      const stage = DOM.receiptStage;
      const savedTop  = stage.style.top;
      const savedLeft = stage.style.left;
      const savedZ    = stage.style.zIndex;
      const savedVis  = stage.style.visibility;

      stage.style.top        = '0px';
      stage.style.left       = '0px';
      stage.style.zIndex     = '-1';
      stage.style.visibility = 'hidden';

      // One frame for the browser to reflow the repositioned element
      await new Promise(r => setTimeout(r, 80));

      const restore = () => {
        stage.style.top        = savedTop;
        stage.style.left       = savedLeft;
        stage.style.zIndex     = savedZ;
        stage.style.visibility = savedVis;
        DOM.shareReceiptBtn.innerHTML = origHTML;
        DOM.shareReceiptBtn.disabled  = false;
      };

      try {
        const canvas = await window.html2canvas(receiptEl, {
          scale:           2,
          backgroundColor: '#08080f',
          logging:         false,
          useCORS:         true,
          allowTaint:      true,
          width:           1080,
          height:          1920,
        });

        restore();

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
                text:  STATE.roastText || 'My internet just got roasted by Spidtes.',
                files: [file],
              });
              return;
            } catch (err) {
              if (err.name === 'AbortError') return; // user cancelled — do nothing
            }
          }

          // Desktop / unsupported: trigger a direct PNG download
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href     = url;
          a.download = 'spidtes-cyber-receipt.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 'image/png');

      } catch (err) {
        console.error('Share failed:', err);
        restore();
        alert('Failed to generate image. Please try again.');
      }
    });
  }

  // Scan Again button (injected into the on-screen results section)
  const scanAgainTrigger = document.getElementById('scan-again-trigger');
  if (scanAgainTrigger) {
    scanAgainTrigger.addEventListener('click', resetScan);
  }

});
