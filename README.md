#  PROJECT: SPIDTES BY OKELAH (Global: SassyRouter)
> A satirical, secure Network Diagnostics & Speedtest Profiler built for global scale.
> Domain Targets: spidtes.my.id (Local) | sassyrouter.dev (Global)

## 📖 Overview
This project is a front-end web application that parodies the "Speedtest by Ookla" interface. It executes a lightweight speed/latency test and fetches the user's IP, ISP, and Geolocation. Instead of a fast speed score, the speedometer UI visually "breaks" and delivers a culturally localized, passive-aggressive "roast" of their network quality.

**Portfolio Objective:** Demonstrates advanced Front-End engineering, REST API integrations, asynchronous JS, Threat Modeling, and Data Privacy (PII redaction).

Underneath the satirical UI, this application serves as a **Cybersecurity and Networking Portfolio Piece**, directly applying **CompTIA Network+** fundamentals and demonstrating practical knowledge of:
- REST API Integration & JSON Parsing
- Network Diagnostics (Latency, Bandwidth, IP Routing, DNS)
- OSINT (Open Source Intelligence) Profiling
- Threat Modeling & Edge Case Handling
- PII (Personally Identifiable Information) Redaction & Zero Trust UI
- CSS Animations & DOM Manipulation
- i18n (Internationalization) & Dynamic Localization

---

## 🛠 Tech Stack & Architecture
- **Front-End:** HTML5, CSS3 (CSS Grid/Flexbox, `text-wrap: balance`, Advanced Animations), Vanilla JavaScript (Zero bloated frameworks).
- **APIs & Diagnostics:** 
  - **Network Routing/OSINT:** `https://ipapi.co/json/` (Enforced HTTPS to prevent Mixed Content blocking).
  - **Bandwidth Check:** `navigator.connection.downlink` OR fallback 500KB micro-download.
  - **Latency (Ping) Check:** 1-pixel image payload load-time calculation via JS `Date.now()`.
- **Virality & Rendering:** 
  - `html2canvas` (Off-screen DOM rendering for 1080x1920 social media receipts).
  - `navigator.share` (Native OS Web Share API integration).
- **Infrastructure & Environment:** 
  - Strictly Client-Side (Zero backend, zero data logging, privacy-by-design).
  - Hosted on GitHub Pages / Vercel ($0.00 Serverless Architecture).

---
## 🎭 Brand Image & UI/UX (The Ookla Parody) 
- **The Persona:** *"Spidtes by Okelah" / "Mas-Mas IT Judes"* (Sarcastic Indonesian IT Guy).
- **Visual System ("Dark Mode Satire"):** 
	- **The Centerpiece:** A glowing, circular CSS speedometer gauge (aspect-ratio preserved for flawless mobile scaling). 
	- **The Fake-Out Animation:** User clicks "GO". The needle revs up, stutters, shakes, drops to zero, and the gauge CSS visually "cracks". 
	- **The Reveal:** A sleek "Cyber Receipt" slams onto the screen containing Ping, Mbps, IP data, and the localized roast.
	- **Privacy Badge:** A permanent, Apple-style footer stating: *🛡️ Zero-Log Policy: Your network data is computed locally. We do not track or store your IP.*
- --- 
## 🧠 The Roast Engine (Content Logic) Utilizes a client-side **Mad Libs Matrix Engine** to prevent joke repetition without the latency or cost of an AI backend. 
- **Variables Parsed:** `Ping` + `Speed (Mbps)` + `ISP` + `Location` 
- **The Formula:** `[Ping/Speed React] + [ISP Roast] + [Location Roast] + [Punchline]` 
- **Yield:** Over 120,000 unique combinations generated purely client-side. 
- **Hyper-Localization Example:** Geolocation bounding. If `Location == "Bali"` or `"Dalung"`, it triggers the highly specific *"Work From Bali but using Kosan Wi-Fi"* logic branch. 
- **Dynamic Escalation (State Management):** Uses `localStorage` to track user sessions. Spamming the "Scan" button triggers increasingly annoyed responses, creating a gamified retention loop. 

--- 
## 🌍 Internationalization (i18n) & Logic Engine Designed for global scale from Day 1, dynamically adjusting context without page reloads. 
- **Language Detection:** Uses `navigator.language` to strictly route users to their cultural locale. 
- **Dual Brand Personas:** - `[id-ID]` -> Persona: *"Mas-Mas IT"* (Targets Indonesian ISPs like IndiHome/Telkomsel, local slang). 
- `[en-US / Default]` -> Persona: *"The Judgy SysAdmin"* (Targets global ISPs like Comcast/Starlink, corporate IT humor). 
- **VPN OSINT Mismatch (Threat Intel):** Compares `navigator.language` with the API's returned `countryCode`. A mismatch (e.g., Indonesian browser language but a US IP address) triggers a dynamic OSINT roast: *"Browser Indo, IP Amerika. Pake VPN gratisan ya bang?"*
  
---
## 🛡 Security & Privacy System (CISO Specs)
This application strictly adheres to modern data privacy standards, treating the Public IP address as highly sensitive PII.

1. **DOM Sanitization (XSS Prevention):** All API outputs are parsed strictly via `textContent` (never `innerHTML`) to prevent Cross-Site Scripting (XSS) injection attacks from spoofed network layers.
2. **Zero Trust UI (Default Deny):** The full IP address is *never* shown by default (`114.120.***.***`). The user must physically "Tap and Hold" an icon to reveal it. This prevents accidental PII leaks via manual OS-level phone screenshots.
3. **Automated PII Redaction:** When exporting the receipt for social media, a JS Regex engine dynamically masks the final octets of both IPv4 and IPv6 addresses.
4. **Data-Conscious Polling:** The bandwidth test relies on native browser APIs (`navigator.connection`) or a <500KB micro-payload to prevent draining user cellular data quotas.
5. **VPN/Proxy Threat Detection:** The API detects if the user is masking their traffic via VPN/Proxy and dynamically adjusts the UI to acknowledge the security measure.
6. **Client-Side Only Architecture:** No backend databases. Zero telemetry. Zero logging. 
7. **HTTPS Enforcement:** API strictly routes via HTTPS to comply with secure Web Crypto and GitHub Pages / Vercel deployment policies.

---

## 🚧 Edge Cases & Threat Mitigations
We mapped critical failure points and turned them into features. *(Note: UX Fallbacks below showcase the `[id-ID]` locale examples).*

| Threat / Edge Case | Technical Mitigation | UX Fallback (The Roast) |
| :--- | :--- | :--- |
| **Completely Offline on Click** | `navigator.onLine` pre-flight check. | *"Ga ada koneksi sama sekali. Nyalain data lu dulu."* |
| **Total Network Timeout** | Error detection via `catch (error)` in `fetch()`. | *"Koneksimu terlalu ampas sampai script seringan ini aja gagal loading."* |
| **Ad-Blocker (Brave) API Block** | `try/catch` wrapper with a strict 3s timeout. | *"Sok asik pake Ad-Blocker. Matiin dulu kalau mau dicek."* |
| **API Rate Limiting (Viral Hug)** | Save successful fetches in `sessionStorage` to prevent API spam. | *"Ngapain di-klik terus? Udah dibilang jelek, gak akan kenceng."* |
| **iOS Safari Blocking Speed API** | Fallback micro-download. If blocked, default to 0.1 Mbps. | *"Browser Safari lu nge-block script gue."* |
| **Unknown/Local ISP (RT/RW Net)** | Default fallback array if ISP string doesn't match majors. | *"ISP apaan nih '{ISP_Name}'? Pasti RT/RW Net patungan se-kosan ya?"* |
| **IPv6 Address Format** | Smart Regex to redact IPv4 OR IPv6 blocks dynamically. | *(Seamless masking. No UI crash).* |
| **Text Overflow on Receipt** | CSS `clamp()`, `break-word`, and `overflow: hidden` on canvas. | *(Prevents broken UI layouts in translated languages).* |
| **In-App Browser Share Fails** | Native `navigator.share` (Web Share API) fallback over downloads. | *(Pushes the viral image natively to IG/WA, bypassing browser blocks).* |

## 🚀 Virality Engine (Growth Architecture)
Optimized natively for Instagram Stories, TikTok photo slides, X (Twitter), and LinkedIn.
- **Off-Screen DOM Rendering:** Dynamically generates a hidden HTML element strictly bounded to **1080x1920 pixels (9:16 aspect ratio)**.
- **The "Cyber Receipt":** Utilizes `html2canvas` to capture the hidden element, producing a pristine, high-resolution graphic. This guarantees zero mobile OS clutter (no battery bars, no Safari UI, no notifications) in the shared image.
- **Dynamic Viral Loop:** Injects a context-aware watermark based on the user's active locale (`spidtes.my.id` for ID, `sassyrouter.dev` for Global) to effortlessly drive organic traffic back to the application.
