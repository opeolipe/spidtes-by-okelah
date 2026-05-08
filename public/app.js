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
  shareNativeBtn:  document.getElementById('share-native-btn'),

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
  scanCount:   0,          // Escalating roast intensity
  timers:      [],         // Held for potential cleanup
  locale:      'en-US',    // Set by detectLocale()
  networkData: null,       // Set by fetchNetworkData()
  roastText:   '',         // Set by generateRoast()
  isVpn:       false,      // Set by detectVpnMismatch()
  speed:       0,          // Un-mocked in startScan()
  ping:        0,          // Un-mocked in startScan()
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
  const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
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
    console.warn('Network fetch failed, using fallback data:', err);
    const reason = (err.name === 'AbortError') ? 'timeout' : 'error';
    return getFallbackData(reason);
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
  // Use real network data if available, otherwise use fallback
  const networkData = STATE.networkData || getFallbackData('not_fetched');
  const roastText   = generateRoast(networkData);

  // Inject all real data into both the on-screen UI and the hidden Cyber Receipt
  injectReceiptData(networkData, roastText);

  // Exit the speedometer section
  DOM.speedometerSect.classList.add('section--exit');

  // After exit animation completes, hide it and show on-screen results
  setTimeout(() => {
    DOM.speedometerSect.style.display = 'none';

    // Show on-screen results
    DOM.resultsRow.setAttribute('aria-hidden', 'false');
    DOM.roastContainer.setAttribute('aria-hidden', 'false');

    // Restore state (scanning done)
    STATE.isScanning = false;
    removeScanningDots();
    DOM.body.classList.remove('is-scanning');
  }, 480);
}


/* ============================================================
   PHASE C — VPN MISMATCH DETECTION
   ============================================================ */

/**
 * detectVpnMismatch(networkData)
 * Compares browser locale language against the API-returned countryCode.
 * Indonesian browser + non-ID IP = VPN detected.
 */
function detectVpnMismatch(networkData) {
  const browserIsId  = navigator.language.toLowerCase().startsWith('id');
  const ipIsId       = networkData.countryCode === 'ID';
  STATE.isVpn        = browserIsId && !ipIsId;
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
    ],
    pingReact: [
      'Ping-mu lebih tinggi dari harapan hidupmu.',
      'Dengan ping segitu, kamu udah kalah sebelum mulai.',
      'Ping {ping}ms? Paket Internet-mu kayak kirim surat lewat kantor pos.',
    ],
    speedReact: [
      'Speedmu {speed} Mbps. Siput pun ngakak.',
      '{speed} Mbps? Kamu mau streaming atau meditasi?',
      'Bahkan IndiHome promo pun malu sama angka ini.',
    ispRoast: {
      'indihome':   ['IndiHome, raja throttling nusantara. Mahal, lambat, tapi tetep dipake karena ga ada pilihan.', 'IndiHome: karena monopoli itu nyata.'],
      'telkomsel':  ['Telkomsel Orbit katanya solusi rumahan. Solusi apa, bro? Solusi bikin emosi?', 'Orbit by Telkomsel: mahal dan tetap kecewa.'],
      'biznet':     ['Biznet harusnya kenceng. Harusnya. Kenyataannya? Ya gini deh.', 'Biznet di kertasnya 100Mbps. Di realitanya... tanya tetangga.'],
      'xl':         ['XL Axiata. X-nya buat X-tras lambat.', 'XL: Xtra Lemot.'],
      'myrepublic': ['MyRepublic katanya gaming ISP. Gaming ISP buat gamer yang suka DC.'],
      'smartfren':  ['Smartfren. Smart dari mana? Dari namanya doang.', 'Smartfren: sinyal 4G, kecepatan 2G.'],
      'first media':['First Media: first dalam harga, last dalam performa.'],
      'default':    ['Wah, ISP apaan nih \'{isp}\'? Pasti RT/RW Net patungan se-kosan ya? Atau numpang Wi-Fi kelurahan di {city}? Pantesan grade lu F.'],
    },
    locationRoast: {
      'bali':     ['Work From Bali tapi WiFi kosan Rp150rb sebulan. Vibes bagus, koneksi ngenes.', 'Digital nomad di Bali pake WiFi warung. Respek tapi ya... coba FYP dulu deh.'],
      'dalung':   ['Dalung, Bali. Kosan WiFi patungan 6 orang. Speed dibagi rata: nol koma nol.'],
      'jakarta':  ['Jakarta, ibu kota, tapi koneksinya masih kalah sama warnet 2008.', 'DKI Jakarta: macetnya di jalan, macetnya di internet.'],
      'surabaya': ['Surabaya, kota pahlawan. Pahlawan yang ping-nya 300ms.'],
      'bandung':  ['Bandung kota kembang. Kembang kembali jadi dial-up ternyata.'],
      'yogyakarta':['Jogja istimewa katanya. Istimewa lemotnya iya.'],
      'denpasar':  ['Denpasar pride, tapi internet-nya ga ada pride-pride-nya. Lemot bener.', 'Main ke Canggu aja bang, siapa tau dapet WiFi kencengan dikit.'],
      'default':  ['Dimanapun kamu berada, satu hal yang pasti: ISP-mu mengecewakan.', 'Lokasi ga ketemu di database. Tapi internet segini mah udah cukup buat bikin malu.'],
    },
    punchline: [
      'Semoga ISP-mu segera sadar diri.',
      'Hubungi customer service ISP-mu. Nanti deh, masih antri 3 jam.',
      'Ganti ISP atau ganti harapan. Dua-duanya valid.',
      'Coba restart router. Ga bakal ngaruh, tapi setidaknya ada usaha.',
      'Screenshot ini dan kirimin ke CS ISP-mu. Tanda kenangan.',
    ],
  },

  'en-US': {
    vpnRoast: [
      'VPN detected. Hiding from your ISP, or just from the truth about your speeds?',
      'Nice VPN. Still slow though.',
    ],
    pingReact: [
      'A ping of {ping}ms. Were you testing from the moon?',
      '{ping}ms latency. Online gaming? More like online suffering.',
      'Your ping is so high it needs its own postcode.',
    ],
    speedReact: [
      '{speed} Mbps. My grandmother streams faster on carrier pigeon.',
      'Congrats on {speed} Mbps. That\'s... technically a number.',
      'At {speed} Mbps, a YouTube thumbnail takes a lunch break to load.',
    ],
    ispRoast: {
      'comcast':   ['Comcast: because you deserve to pay premium prices for mediocre service.', 'Comcast Xfinity: infinity waits, finite speed.'],
      'at&t':      ['AT&T: Attempted Terrible Throughput.', 'AT&T fiber? More like AT&T fi-blur.'],
      'starlink':  ['Starlink — technology from space, latency still from Earth.', 'Elon sent satellites to orbit. Your ping is still in geostationary.'],
      'spectrum':  ['Spectrum: the full spectrum of disappointment.', 'Spectrum promises fast internet. Must be a different spectrum.'],
      'verizon':   ['Verizon Fios: Fi-os as in "finally, os slow."', 'Can you hear me now? Verizon can. Your packets? Not so much.'],
      'cox':       ['Cox Communications. The name says it all, really.'],
      'virgin':    ['Virgin Media: still virgin to the concept of consistent speeds.'],
      'bt ':       ['BT Broadband: British Throttling, as per tradition.'],
      'default':   ['"{isp}" — never heard of them, but based on these results, I\'m not surprised.', 'Unknown ISP. Unknown why you\'re still with them after this.'],
    },
    locationRoast: {
      'california':['Silicon Valley adjacent, but your speeds are still in the valley — the bad valley.'],
      'new york':  ['New York City. Fastest city in the world. Slowest Wi-Fi in the building.'],
      'london':    ['London: world-class city, Victorian-era broadband.'],
      'sydney':    ['Australia: beautiful country, geographically cursed internet infrastructure.'],
      'singapore': ['Singapore has some of the best internet in Asia. You are the exception.'],
      'default':   ['Wherever you are, your ISP has clearly never been there.', 'Location unknown, disappointment universal.'],
    },
    punchline: [
      'Have you tried turning your ISP off and not turning it back on?',
      'File a complaint. They won\'t fix it, but at least you\'ll feel something.',
      'Consider a career in interpretive dance. Your data packets already are.',
      'Restart your router. It won\'t help. But hope is free.',
      'Screenshot this. Frame it. A monument to your ISP\'s audacity.',
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

  const speed = STATE.speed;
  const ping  = STATE.ping;

  // 1. VPN override prefix
  if (STATE.isVpn) {
    parts.push(pick(dict.vpnRoast));
  }

  // 2. Ping/speed reaction (alternate based on scan count for variety)
  const reactLine = STATE.scanCount % 2 === 0
    ? pick(dict.pingReact)
    : pick(dict.speedReact);
  parts.push(
    reactLine
      .replace('{ping}',  ping)
      .replace('{speed}', speed)
  );

  // 3. ISP roast — fuzzy match against dict keys
  const ispLower = (networkData.isp || '').toLowerCase();
  const city     = networkData.city || (STATE.locale === 'id-ID' ? 'wilayah entah mana' : 'nowhere');
  let ispLine = null;
  for (const [key, lines] of Object.entries(dict.ispRoast)) {
    if (key !== 'default' && ispLower.includes(key)) {
      ispLine = pick(lines).replace('{isp}', networkData.isp);
      break;
    }
  }
  if (!ispLine) {
    ispLine = pick(dict.ispRoast.default)
      .replace('{isp}',  networkData.isp || '???')
      .replace('{city}', city);
  }
  parts.push(ispLine);

  // 4. Location roast — fuzzy match on city
  const cityLower = city.toLowerCase();
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

  STATE.roastText = parts.filter(Boolean).join(' ');
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
  if (speedMbps > 5  || pingMs < 200) return 'D';
  return 'F';
}

/**
 * injectReceiptData(networkData, roastText)
 * Populates ALL receipt fields via textContent only (XSS-safe).
 * Also updates the live meta bar in the header.
 */
function injectReceiptData(networkData, roastText) {
  const speed = STATE.speed;
  const ping  = STATE.ping;
  const grade = calculateGrade(speed, ping);
  const location = [networkData.city, networkData.country].filter(Boolean).join(', ') || '—';

  // ── Meta bar (live header) ── textContent only
  if (DOM.ispDisplay)      DOM.ispDisplay.textContent      = networkData.isp      || '—';
  if (DOM.locationDisplay) DOM.locationDisplay.textContent = location;
  // Zero Trust UI: display fully masked IP by default
  if (DOM.ipDisplay)       DOM.ipDisplay.textContent       = '***.***.***.***';

  // ── On-Screen Results (Desktop UI) ──
  if (DOM.resultDlVal)     DOM.resultDlVal.textContent     = speed;
  if (DOM.resultPingVal)   DOM.resultPingVal.textContent   = ping;
  if (DOM.resultGradeVal)  DOM.resultGradeVal.textContent  = grade;

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
async function startScan() {
  // Guard: prevent double-clicks
  if (STATE.isScanning) return;

  STATE.isScanning = true;
  STATE.scanCount++;

  // Clear any leftover timers from previous run
  clearAllTimers();

  // Reset visuals cleanly before starting
  if (DOM.needleGroup) {
    DOM.needleGroup.classList.remove('needle--revving', 'needle--stutter', 'needle--crash');
    DOM.needleGroup.style.transform = `rotate(${NEEDLE.start}deg)`;
  }
  if (DOM.speedometerWrap) {
    DOM.speedometerWrap.classList.remove('gauge--broken');
  }
  if (DOM.speedValue) {
    DOM.speedValue.classList.remove('is-glitching');
    DOM.speedValue.textContent = '0';
  }
  if (DOM.pingValue) {
    DOM.pingValue.textContent = '-- ms';
  }
  setGaugeFill(0);

  // Lock GO button & inject loading dots
  DOM.body.classList.add('is-scanning');
  injectScanningDots();

  // Un-mock speeds: realistic random or navigator.connection data
  try {
    STATE.speed = (navigator.connection && navigator.connection.downlink)
      ? parseFloat(navigator.connection.downlink).toFixed(1) 
      : (Math.random() * 10).toFixed(1);
  } catch (e) {
    STATE.speed = (Math.random() * 10).toFixed(1);
  }
  STATE.ping  = Math.floor(Math.random() * (300 - 15 + 1)) + 15;

  // ── Sprint 3: Fire network fetch CONCURRENTLY with the animation ──
  // fetchNetworkData is non-blocking; animation runs regardless of result.
  // By the time phase5_reveal fires at t=4000ms, the 3s fetch is done.
  fetchNetworkData().then((data) => {
    STATE.networkData = data;
    
    // Force id-ID locale if country is Indonesia, regardless of browser settings
    if (data && (data.countryCode === 'ID' || data.country === 'Indonesia')) {
      STATE.locale = 'id-ID';
    }
    
    detectVpnMismatch(data);
  }).catch((err) => {
    console.error('Fetch error in startScan:', err);
    STATE.networkData = getFallbackData('error');
  });

  // Kick off the 4-second fake-out sequence with a tiny delay to ensure DOM paint
  setTimeout(() => {
    if (STATE.isScanning) {
      runFakeOutSequence();
    }
  }, 50);
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Detect locale immediately on load
  detectLocale();

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

  // ── Phase 1: Zero Trust UI (Tap-to-Reveal IP) ──
  if (DOM.ipRevealBtn && DOM.ipDisplay) {
    const revealIp = () => {
      if (STATE.networkData && STATE.networkData.ip) {
        DOM.ipDisplay.textContent = STATE.networkData.ip;
        DOM.ipDisplay.style.color = 'var(--text-primary)';
      }
    };
    const hideIp = () => {
      DOM.ipDisplay.textContent = '***.***.***.***';
      DOM.ipDisplay.style.color = '';
    };

    DOM.ipRevealBtn.addEventListener('mousedown', revealIp);
    DOM.ipRevealBtn.addEventListener('touchstart', revealIp, { passive: true });

    DOM.ipRevealBtn.addEventListener('mouseup', hideIp);
    DOM.ipRevealBtn.addEventListener('mouseleave', hideIp);
    DOM.ipRevealBtn.addEventListener('touchend', hideIp, { passive: true });
  }

  // ── Phase 3: Viral Share Engine (Export to Image) ──
  if (DOM.shareReceiptBtn) {
    DOM.shareReceiptBtn.addEventListener('click', async () => {
      if (!window.html2canvas) {
        alert('Export library is still loading. Please try again in a moment.');
        return;
      }

      const receiptEl = document.getElementById('cyber-receipt');
      if (!receiptEl) return;

      // Ensure the stage is temporarily fully visible so html2canvas can render it properly
      const originalDisplay = DOM.receiptStage.style.display;
      const originalOpacity = DOM.receiptStage.style.opacity;
      const originalPointer = DOM.receiptStage.style.pointerEvents;
      
      DOM.receiptStage.style.display = 'flex';
      DOM.receiptStage.style.opacity = '1';
      DOM.receiptStage.style.pointerEvents = 'auto';

      // Slight delay to allow DOM to settle before painting
      await new Promise(r => setTimeout(r, 50));

      try {
        const canvas = await window.html2canvas(receiptEl, {
          scale: 2,               // 1080x1920 @ 2x scaling for crisp social sharing
          backgroundColor: '#08080f',
          logging: false,
          useCORS: true           // Just in case we add external images later
        });

        // Restore original stage visibility
        DOM.receiptStage.style.display = originalDisplay;
        DOM.receiptStage.style.opacity = originalOpacity;
        DOM.receiptStage.style.pointerEvents = originalPointer;

        canvas.toBlob(async (blob) => {
          if (!blob) throw new Error('Canvas to Blob conversion failed');

          const file = new File([blob], 'spidtes-cyber-receipt.png', { type: 'image/png' });

          // Try native Web Share API first
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: 'My Network Roast by Spidtes',
                text: 'My internet was just absolutely roasted by Spidtes. Check out my Cyber Receipt.',
                files: [file]
              });
              return;
            } catch (err) {
              // User likely cancelled the share dialog, which is fine
              if (err.name !== 'AbortError') console.error('Share failed:', err);
            }
          } else {
            // Fallback for Desktop/Unsupported Browsers: Download the image directly
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'spidtes-cyber-receipt.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');

      } catch (error) {
        console.error('Failed to generate Cyber Receipt image:', error);
        alert('Failed to generate image. Please try again.');
        // Restore on error
        DOM.receiptStage.style.display = originalDisplay;
        DOM.receiptStage.style.opacity = originalOpacity;
        DOM.receiptStage.style.pointerEvents = originalPointer;
      }
    });
  }

  // Optional: Share native button (just triggers the same export for now, or text share)
  if (DOM.shareNativeBtn) {
    DOM.shareNativeBtn.addEventListener('click', () => {
      if (DOM.shareReceiptBtn) DOM.shareReceiptBtn.click();
    });
  }

});
