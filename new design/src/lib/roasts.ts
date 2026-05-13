/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RoastResult {
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  comment: string;
  advice: string;
}

export const getRoast = (speed: number, isp: string, isVPN: boolean, country: string): RoastResult => {
  const normalizedISP = isp.toLowerCase();

  if (isVPN) {
    return {
      grade: "C",
      comment: "A VPN? Very mysterious. Unfortunately, encrypting slow packets just makes them slow and encrypted.",
      advice: "The IT Dept is logging this as 'Suspiciously Cautious'. It's 2026 — they've seen this before."
    };
  }

  // Speed is in Mbps
  if (speed < 2) {
    return {
      grade: "F",
      comment: "Is your router taking a nap? This connection is so slow it qualified for a pension.",
      advice: "Have you tried turning it off, waiting 10 years, and turning it back on? At this rate, try 20."
    };
  }

  if (speed < 10) {
    return {
      grade: "D",
      comment: "We call this 'Scenic Route' internet. Enjoy the buffering wheel — it spins for free.",
      advice: "Politely ask your ISP what you're actually paying for. Bring documentation."
    };
  }

  if (speed < 50) {
    return {
      grade: "B",
      comment: "Not bad, but not exactly breaking any speed limits either. It's aggressively mediocre.",
      advice: "Perfect speed for accidentally unmuting yourself on a conference call, then freezing mid-apology."
    };
  }

  if (speed >= 100) {
    return {
      grade: "S",
      comment: "Whoa, look at you go! Did you plug your laptop directly into the backbone of the internet?",
      advice: "Your router deserves a raise, a plaque, and its own LinkedIn profile."
    };
  }

  return {
    grade: "A",
    comment: "Actually pretty solid! You must be the ISP's one success story they put in the brochure.",
    advice: "Don't get used to it. The universe demands buffering eventually. Always."
  };
};

export const ISP_JOKES: Record<string, string[]> = {
  "indihome": [
    "Ah, the classic 'please restart your router' experience.",
    "Customer service says your ticket is 'in progress'. Grab a coffee. Then another.",
    "The red LOS light blinking is basically a national past-time.",
    "IndiHome: where 'technician will come tomorrow' means sometime this fiscal quarter."
  ],
  "telkomsel": [
    "Full bars, zero bytes. A classic magic trick.",
    "The quota division math here requires a PhD to understand.",
    "Orbit by Telkomsel: same disappointment, now satellite-assisted."
  ],
  "biznet": [
    "Business speeds on paper, scenic route speeds in reality.",
    "The 'up to' in your speed tier is doing a lot of heavy lifting.",
    "Biznet: where 'dedicated line' is more of a philosophy than a product."
  ],
  "comcast": [
    "Xfinity: the only thing faster than their speed is how quickly they raise your bill.",
    "Comcast: because you don't have a choice, and we both know it.",
    "America's most-hated ISP, and still your only option. Outstanding."
  ],
  "xl": [
    "XL Axiata: the 'X' stands for 'X-tra patient required'.",
    "Full signal, empty packets. It's art, really."
  ],
  "firstmedia": [
    "First in name. Last in delivery.",
    "First Media: teaching subscribers the value of waiting since day one."
  ]
};

export const getISPJoke = (isp: string): string => {
  const key = Object.keys(ISP_JOKES).find(k => isp.toLowerCase().includes(k));
  if (key) {
    const jokes = ISP_JOKES[key];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  return "Your ISP is so obscure even my traceroute got lost.";
};
