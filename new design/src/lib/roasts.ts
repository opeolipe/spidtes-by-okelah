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
      advice: "The IT Dept is logging this as 'Suspiciously Cautious'."
    };
  }

  // Speed is in Mbps
  if (speed < 2) {
    return {
      grade: "F",
      comment: "Is your router taking a nap? Because this connection is deeply relaxed.",
      advice: "Have you tried turning it off, waiting 10 years, and turning it back on?"
    };
  }

  if (speed < 10) {
    return {
      grade: "D",
      comment: "We call this 'Scenic Route' internet. Enjoy the view while the page loads.",
      advice: "Perhaps it's time to politely ask your ISP what you're actually paying for."
    };
  }

  if (speed < 50) {
    return {
      grade: "B",
      comment: "Not bad, but not exactly breaking any speed limits either. It's aggressively average.",
      advice: "Perfect speed for accidentally unmuting yourself on a conference call."
    };
  }

  if (speed >= 100) {
    return {
      grade: "S",
      comment: "Whoa, look at you go! Did you plug your laptop directly into the mainframe?",
      advice: "Your router deserves a raise. Or at least a little pat on the antennae."
    };
  }

  return {
    grade: "A",
    comment: "Actually pretty solid! You must be the ISP's favorite customer today.",
    advice: "Don't get used to it. The universe demands buffering eventually."
  };
};

export const ISP_JOKES: Record<string, string[]> = {
  "indihome": [
    "Ah, the classic 'please restart your router' experience.",
    "Customer service says your ticket is 'in progress'. Grab a coffee.",
    "The red LOS light blinking is basically a national past-time."
  ],
  "telkomsel": [
    "Full bars, zero bytes. A classic magic trick.",
    "The quota division math here requires a PhD to understand."
  ],
  "biznet": [
    "Business speeds on paper, scenic route speeds in reality.",
    "The 'up to' in your speed tier is doing a lot of heavy lifting."
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
