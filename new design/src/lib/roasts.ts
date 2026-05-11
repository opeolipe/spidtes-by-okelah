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
      comment: "Trying to hide with a VPN, huh? I still see your packets shivering.",
      advice: "The IT Dept knows you're browsing something you shouldn't."
    };
  }

  // Speed is in Mbps
  if (speed < 2) {
    return {
      grade: "F",
      comment: "Is this internet or a carrier pigeon? Dial-up called, they want their latency back.",
      advice: "Move your router out of the microwave. Or pay your bill."
    };
  }

  if (speed < 10) {
    return {
      grade: "D",
      comment: `Slow and steady wins the race... but not in ${country}. This is painful.`,
      advice: "Upgrade from that 'Paket Hemat' already."
    };
  }

  if (speed < 50) {
    return {
      grade: "B",
      comment: `Typical ${isp} experience. Not great, not terrible. Just... meh.`,
      advice: "Restart your router. It won't help, but it'll give you something to do."
    };
  }

  if (speed >= 100) {
    return {
      grade: "S",
      comment: "Flexing much? You're definitely skipping the meeting and just downloading 4K memes.",
      advice: "Share some bandwidth with your neighbors, you legend."
    };
  }

  return {
    grade: "A",
    comment: "Decent speed. You can finally watch a YouTube video in 1080p without buffering for 20 minutes.",
    advice: "Don't get too comfortable. ${isp} is watching."
  };
};

export const ISP_JOKES: Record<string, string[]> = {
  "indihome": [
    "Indihome? More like Indi-hang.",
    "Customer service is checking your terminal... for the 10th time today.",
    "Red light blinking? Take a nap, it'll be fixed by next year."
  ],
  "telkomsel": [
    "Signal full bar, speed zero? Must be a holiday.",
    "Beli kuota 50GB, yang bisa dipake cuma 2GB 'lokal'. Genius."
  ],
  "biznet": [
    "Biznet in the streets, 502 Bad Gateway in the sheets.",
    "Paying for business speed, getting intern coffee-run results."
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
