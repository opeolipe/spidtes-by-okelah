/**
 * ============================================================
 * SPIDTES BY OKELAH™ — app.js (New Design Edition)
 * ============================================================
 */

'use strict';

const DOM = {
  // States
  idle: document.getElementById('state-idle'),
  testing: document.getElementById('state-testing'),
  result: document.getElementById('state-result'),

  // Header
  ipDisplayHeader: document.getElementById('ip-display-header'),

  // Controls
  goBtn: document.getElementById('go-btn'),
  scanAgainBtn: document.getElementById('scan-again-trigger'),
  shareBtn: document.getElementById('share-receipt-btn'),
  nativeShareBtn: document.getElementById('native-share-btn'),

  // Gauge
  speedValue: document.getElementById('speed-value'),
  gaugeNeedle: document.getElementById('gauge-needle'),
  gaugeProgress: document.getElementById('gauge-progress'),
  testPhaseLabel: document.getElementById('test-phase-label'),
  integrityValue: document.getElementById('integrity-value'),
  integrityBar: document.getElementById('integrity-bar'),

  // Receipt
  receiptGrade: document.getElementById('receipt-grade'),
  receiptTime: document.getElementById('receipt-time'),
  receiptDate: document.getElementById('receipt-date'),
  receiptIsp: document.getElementById('receipt-isp'),
  receiptLocation: document.getElementById('receipt-location'),
  receiptIp: document.getElementById('receipt-ip'),
  receiptPrivacy: document.getElementById('receipt-privacy'),
  receiptRoast: document.getElementById('receipt-roast'),
  resultJoke: document.getElementById('result-joke'),
};

const STATE = {
  isScanning: false,
  scanCount: 0,
  timers: [],
  locale: 'en-US',
  networkData: null,
  roastText: '',
  lastRoast: '',
  isVpn: false,
  pingMs: 999,
  jitterMs: 0,
  speedMbps: 0.1,
  uploadMbps: null,
};

/* ============================================================
   UTILITIES
   ============================================================ */

function setGauge(mbps) {
  // Map speed 0-100 to rotation -120 to 120 degrees
  const rotation = Math.min(120, Math.max(-120, (mbps / 100) * 240 - 120));
  const dashLength = (mbps / 100) * 180;
  
  if (DOM.gaugeNeedle) DOM.gaugeNeedle.style.transform = `rotate(${rotation}deg)`;
  if (DOM.gaugeProgress) DOM.gaugeProgress.setAttribute('stroke-dasharray', `${dashLength} 282`);
  
  // Dynamic color for progress
  const color = mbps > 80 ? '#22c55e' : mbps > 40 ? '#eab308' : '#ef4444';
  if (DOM.gaugeProgress) DOM.gaugeProgress.setAttribute('stroke', color);
  if (DOM.gaugeNeedle) DOM.gaugeNeedle.style.backgroundColor = color;
  if (DOM.gaugeNeedle) DOM.gaugeNeedle.style.boxShadow = `0 0 15px ${color}80`;
}

function updateIntegrity(mbps) {
  const percent = Math.min(100, Math.floor(mbps * 1.5));
  if (DOM.integrityValue) DOM.integrityValue.textContent = `${percent}%`;
  if (DOM.integrityBar) DOM.integrityBar.style.width = `${percent}%`;
}

function animateCounter(fromVal, toVal, durationMs, onUpdate) {
  const startTime = performance.now();
  const diff = toVal - fromVal;

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = (fromVal + diff * eased).toFixed(1);
    onUpdate(current);
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }
  requestAnimationFrame(tick);
}

function schedule(fn, delay) {
  const id = setTimeout(fn, delay);
  STATE.timers.push(id);
  return id;
}

function clearAllTimers() {
  STATE.timers.forEach(clearTimeout);
  STATE.timers = [];
}

/* ============================================================
   STATE MANAGEMENT
   ============================================================ */

function switchState(target) {
  DOM.idle.classList.add('hidden');
  DOM.testing.classList.add('hidden');
  DOM.result.classList.add('hidden');
  
  if (target === 'IDLE') DOM.idle.classList.remove('hidden');
  if (target === 'TESTING') DOM.testing.classList.remove('hidden');
  if (target === 'RESULT') DOM.result.classList.remove('hidden');
}

async function startScan() {
  if (STATE.isScanning) return;
  STATE.isScanning = true;
  STATE.scanCount++;
  
  // Reset data for new run
  STATE.speedMbps = 0.1;
  STATE.pingMs = 999;
  STATE.uploadMbps = null;
  STATE.networkData = null;
  STATE.isVpn = false;
  
  switchState('TESTING');
  DOM.testPhaseLabel.textContent = 'Probing network layers...';
  
  // Concurrent measurements
  fetchNetworkData().then(data => {
    STATE.networkData = data;
    detectLocaleFromNetwork(data);
    detectVpnMismatch(data);
    if (DOM.ipDisplayHeader) DOM.ipDisplayHeader.textContent = maskIp(data.ip);
  }).catch(() => {
    STATE.networkData = getFallbackData('error');
  });
  
  measurePing().then(ms => STATE.pingMs = ms).catch(() => {});
  measureSpeed().then(mbps => STATE.speedMbps = mbps).catch(() => {});
  measureJitter().then(ms => STATE.jitterMs = ms).catch(() => {});
  measureUpload().then(mbps => STATE.uploadMbps = mbps).catch(() => {});

  // Animation Sequence (Fake-out Rev)
  schedule(() => {
    DOM.testPhaseLabel.textContent = 'Aggregating packets...';
    const revSpeed = 82.4;
    setGauge(revSpeed);
    updateIntegrity(revSpeed);
    animateCounter(0, revSpeed, 1200, (v) => {
      DOM.speedValue.textContent = v;
    });
  }, 300);

  // Settle to Real Value
  schedule(() => {
    DOM.testPhaseLabel.textContent = 'Decrypting "Mas-Mas IT" thoughts...';
    const realSpeed = STATE.speedMbps > 0.1 ? STATE.speedMbps : 12.5;
    setGauge(realSpeed);
    updateIntegrity(realSpeed);
    animateCounter(82.4, realSpeed, 1800, (v) => {
      DOM.speedValue.textContent = v;
    });
  }, 2200);

  // Finalize
  schedule(() => {
    finalizeTest();
  }, 4500);
}

function finalizeTest() {
  const networkData = STATE.networkData || getFallbackData('timeout');
  const roastText = generateRoast(networkData);
  STATE.roastText = roastText;
  
  injectReceiptData(networkData, roastText);
  switchState('RESULT');
  STATE.isScanning = false;

  // Save to history
  const grade = calculateGrade(STATE.speedMbps, STATE.pingMs);
  saveToHistory(networkData, grade);
  renderHistoryPanel();
}

function injectReceiptData(networkData, roastText) {
  const speed = STATE.speedMbps;
  const ping = STATE.pingMs;
  const grade = calculateGrade(speed, ping);
  
  const now = new Date();
  if (DOM.receiptGrade) DOM.receiptGrade.textContent = grade;
  if (DOM.receiptTime) DOM.receiptTime.textContent = now.toLocaleTimeString();
  if (DOM.receiptDate) DOM.receiptDate.textContent = now.toLocaleDateString();
  
  if (DOM.receiptIsp) DOM.receiptIsp.textContent = networkData.isp || '—';
  const location = [networkData.city, networkData.countryCode].filter(Boolean).join(', ') || 'Unknown';
  if (DOM.receiptLocation) DOM.receiptLocation.textContent = location;
  if (DOM.receiptIp) DOM.receiptIp.textContent = maskIp(networkData.ip);
  if (DOM.receiptPrivacy) {
    DOM.receiptPrivacy.textContent = STATE.isVpn ? 'MASKED (VPN)' : 'EXPOSED (RAW)';
    DOM.receiptPrivacy.className = `text-[11px] font-bold text-right truncate ${STATE.isVpn ? 'text-blue-600' : 'text-amber-600'}`;
  }
  
  if (DOM.receiptRoast) DOM.receiptRoast.textContent = `"${roastText}"`;
  
  if (DOM.resultJoke) {
      const isId = STATE.locale === 'id-ID';
      DOM.resultJoke.textContent = isId ? 'Typical provider behavior. Paket hemat ya bang?' : 'Typical provider behavior. Dial-up called.';
  }

  // Set grade color
  if (DOM.receiptGrade) {
      DOM.receiptGrade.className = `text-8xl font-black leading-none ${
          grade === 'A' || grade === 'S' ? 'text-green-600' : 
          grade === 'F' ? 'text-red-600' : 'text-zinc-800'
      }`;
  }
}

function resetScan() {
  clearAllTimers();
  STATE.isScanning = false;
  setGauge(0);
  updateIntegrity(0);
  DOM.speedValue.textContent = '0.0';
  switchState('IDLE');
}

/* ============================================================
   NETWORK & ROAST LOGIC (THE SYSTEM)
   ============================================================ */

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRoast(networkData) {
  const locale = STATE.locale;
  const dict = ROAST_DICT[locale] || ROAST_DICT['en-US'];
  const parts = [];

  const speed = STATE.speedMbps;
  const ping = STATE.pingMs;
  const grade = calculateGrade(speed, ping);

  const getSpeedAdj = (s) => {
    if (s < 1) return locale === 'id-ID' ? '(kecepatan prasejarah)' : '(prehistoric speeds)';
    if (s < 5) return locale === 'id-ID' ? '(siput mager)' : '(snail pace)';
    if (s > 100) return locale === 'id-ID' ? '(pamer doang)' : '(just flexin\')';
    return '';
  };

  const sub = (line) => line.replace('{ping}', ping).replace('{speed}', `${speed} ${getSpeedAdj(speed)}`).replace('{isp}', networkData.isp);

  // 1. Metric Roast
  if (grade === 'F' || speed < 10) {
    parts.push(sub(pick(dict.speedReact)));
  } else if (ping > 150) {
    parts.push(sub(pick(dict.pingReact)));
  } else {
    parts.push(sub(pick(dict.speedReact)));
  }

  // 2. ISP Roast
  const ispLower = (networkData.isp || '').toLowerCase();
  let contextLine = null;
  
  if (Array.isArray(dict.ispRoast)) {
    for (const group of dict.ispRoast) {
      if (group.match.some(m => ispLower.includes(m))) {
        contextLine = sub(pick(group.lines));
        break;
      }
    }
  }

  if (!contextLine) {
    contextLine = sub(pick(dict.ispRoastDefault));
  }
  parts.push(contextLine);

  // 3. Device Roast
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) parts.push(dict.deviceRoast.iphone);
  else if (/Android/i.test(ua)) parts.push(dict.deviceRoast.android);
  else parts.push(dict.deviceRoast.desktop);

  // 4. Punchline
  parts.push(pick(dict.punchline));

  return parts.join(' ');
}

function maskIp(ip) {
  if (!ip || ip === 'Checking IP...') return '***.***.***.***';
  if (ip.includes(':')) {
    let parts = ip.split(':');
    if (parts.length > 2) {
        return parts.slice(0, 2).join(':') + ':****:****';
    }
    return ip.slice(0, 8) + '...';
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    return ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***');
  }
  return '***.***.***.***';
}

function calculateGrade(speedMbps, pingMs) {
  if (speedMbps > 50 && pingMs < 30) return 'A';
  if (speedMbps > 20 && pingMs < 60) return 'B';
  if (speedMbps > 10 && pingMs < 100) return 'C';
  if (speedMbps > 5 && pingMs < 200) return 'D';
  return 'F';
}

async function fetchNetworkData() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const raw = await response.json();
    return {
      ip: String(raw.ip || ''),
      isp: String(raw.org || raw.isp || 'Unknown ISP'),
      city: String(raw.city || 'Somewhere'),
      country: String(raw.country_name || 'Earth'),
      countryCode: String(raw.country_code || 'XX').toUpperCase(),
    };
  } catch (err) {
    return getFallbackData('error');
  }
}

function getFallbackData(reason) {
  const isId = STATE.locale === 'id-ID';
  return {
    ip: '127.0.0.1',
    isp: isId ? 'Koneksi Gaib' : 'Offline/Blocked',
    city: isId ? 'Antah Berantah' : 'Nowhere',
    country: 'Void',
    countryCode: '??',
    _reason: reason
  };
}

async function measurePing() {
  const start = performance.now();
  try {
    await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
    return Math.round(performance.now() - start);
  } catch { return 999; }
}

async function measureSpeed() {
  try {
    const start = performance.now();
    const resp = await fetch('./speedtest.bin', { cache: 'no-store' });
    const buf = await resp.arrayBuffer();
    const elapsed = (performance.now() - start) / 1000;
    const mbps = (buf.byteLength * 8) / (elapsed * 1_000_000);
    return Math.max(0.1, Math.round(mbps * 10) / 10);
  } catch { return 12.5; }
}

async function measureJitter() {
    return Math.floor(Math.random() * 20); // Simplified jitter
}

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

function detectLocale() {
  const lang = (navigator.language || 'en').toLowerCase();
  STATE.locale = lang.startsWith('id') ? 'id-ID' : 'en-US';
  return STATE.locale;
}

function detectLocaleFromNetwork(data) {
    if (data.countryCode === 'ID') STATE.locale = 'id-ID';
}

function detectVpnMismatch(data) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('id') && data.countryCode !== 'ID') STATE.isVpn = true;
    else STATE.isVpn = false;
}

/* ============================================================
   HISTORY
   ============================================================ */

function saveToHistory(networkData, grade) {
  try {
    const entry = {
      ts: Date.now(),
      dl: STATE.speedMbps,
      ping: STATE.pingMs,
      grade,
      isp: networkData.isp
    };
    const history = JSON.parse(localStorage.getItem('spidtes_history') || '[]');
    history.unshift(entry);
    localStorage.setItem('spidtes_history', JSON.stringify(history.slice(0, 5)));
  } catch (_) {}
}

function renderHistoryPanel() {
  const history = JSON.parse(localStorage.getItem('spidtes_history') || '[]');
  const list = document.querySelector('.history-list');
  const panel = document.getElementById('history-panel');
  if (!list || !panel) return;

  if (history.length === 0) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  
  list.innerHTML = history.map(entry => {
    const date = new Date(entry.ts);
    return `
      <div class="history-item">
        <div class="flex items-center gap-3">
          <span class="font-black ${entry.grade === 'A' || entry.grade === 'S' ? 'text-green-500' : entry.grade === 'F' ? 'text-red-500' : 'text-zinc-500'}">${entry.grade}</span>
          <span class="text-zinc-400 font-mono text-[10px]">${entry.dl} Mbps · ${entry.ping}ms</span>
        </div>
        <span class="text-[9px] text-zinc-600 font-mono">${date.getHours()}:${date.getMinutes()}</span>
      </div>
    `;
  }).join('');
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  detectLocale();
  renderHistoryPanel();
  
  DOM.goBtn.addEventListener('click', startScan);
  if (DOM.scanAgainBtn) DOM.scanAgainBtn.addEventListener('click', resetScan);
  
  // Initial IP fetch for header
  fetchNetworkData().then(data => {
    if (DOM.ipDisplayHeader) DOM.ipDisplayHeader.textContent = maskIp(data.ip);
  });

  // Share logic
  if (DOM.nativeShareBtn) {
      DOM.nativeShareBtn.addEventListener('click', () => {
          if (navigator.share) {
              navigator.share({
                  title: 'Spidtes Roast',
                  text: STATE.roastText,
                  url: window.location.href
              });
          }
      });
  }

  if (DOM.shareBtn) {
      DOM.shareBtn.addEventListener('click', async () => {
          // Lazy load html2canvas
          if (!window.html2canvas) {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
              document.head.appendChild(script);
              await new Promise(r => script.onload = r);
          }
          
          const receipt = document.getElementById('cyber-receipt');
          const canvas = await html2canvas(receipt, { 
              backgroundColor: '#fafafa', 
              scale: 2,
              useCORS: true,
              allowTaint: true
          });
          const link = document.createElement('a');
          link.download = `spidtes-receipt-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      });
  }
});
