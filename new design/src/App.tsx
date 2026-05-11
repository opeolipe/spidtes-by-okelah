/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wifi, 
  ShieldAlert, 
  Activity, 
  Globe, 
  Terminal, 
  Cpu, 
  AlertTriangle,
  Zap
} from "lucide-react";
import Gauge from "./components/Gauge";
import CyberReceipt from "./components/CyberReceipt";
import { fetchNetworkInfo, NetworkInfo, maskIP } from "./lib/api";
import { getRoast, RoastResult, getISPJoke } from "./lib/roasts";
import confetti from "canvas-confetti";

type AppState = "IDLE" | "PREPARING" | "TESTING" | "RESULT";

export default function App() {
  const [state, setState] = useState<AppState>("IDLE");
  const [speed, setSpeed] = useState(0);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [testPhase, setTestPhase] = useState<string>("Initializing...");

  // Initial load: fetch basic network info (masked)
  useEffect(() => {
    fetchNetworkInfo().then(setNetworkInfo);
  }, []);

  const runTest = useCallback(async () => {
    setState("PREPARING");
    setTestPhase("Probing network layers...");
    
    // Simulate initial delay
    await new Promise(r => setTimeout(r, 1500));
    
    setState("TESTING");
    setTestPhase("Aggregating packets...");
    
    // Simulating speed fluctuations
    let currentSpeed = 0;
    const targetSpeed = Math.random() * 120; // Simulated speed for the demo
    
    const startTime = Date.now();
    const duration = 5000; // 5 seconds test

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        clearInterval(interval);
        finalizeTest(targetSpeed);
      } else {
        // Wobble physics
        const wobble = Math.sin(elapsed / 100) * 5;
        const base = progress < 0.8 ? targetSpeed * progress : targetSpeed;
        setSpeed(Math.max(0, base + wobble));
        
        if (progress > 0.3) setTestPhase("Checking ISP bad habits...");
        if (progress > 0.6) setTestPhase("Decrypting 'Mas-Mas IT' thoughts...");
      }
    }, 50);
  }, [networkInfo]);

  const finalizeTest = (finalSpeed: number) => {
    if (!networkInfo) return;
    
    setSpeed(finalSpeed);
    const result = getRoast(finalSpeed, networkInfo.isp, networkInfo.is_vpn, networkInfo.country);
    setRoast(result);
    setTestPhase("Finalizing report...");
    
    setTimeout(() => {
      setState("RESULT");
      if (result.grade === "S" || result.grade === "A") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#ffffff', '#000000']
        });
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-white selection:text-black overflow-x-hidden">
      {/* Dynamic Background Noise/Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      
      {/* Decorative Lights */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[120px]" />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-24 flex flex-col items-center">
        {/* Header */}
        <header className="w-full flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black rounded-lg">S</div>
            <h1 className="text-xl font-bold tracking-tighter">SPIDTES</h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
            <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> CLI v1.0.4</span>
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Serverless</span>
            <span className="flex items-center gap-1 text-zinc-400">
              {networkInfo ? maskIP(networkInfo.ip) : "Checking IP..."}
            </span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {state === "IDLE" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center text-center mt-12"
            >
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
                <ShieldAlert className="w-3 h-3 text-amber-500" />
                Zero-Log PII Protection Active
              </div>
              
              <h2 className="text-5xl md:text-8xl font-black mb-6 tracking-tight leading-none">
                ENOUGH <br />
                <span className="text-zinc-600">POLITE SPEEDS.</span>
              </h2>
              
              <p className="max-w-md text-zinc-500 mb-12 text-sm leading-relaxed">
                The most sarcastic network profiler in Dalung. 
                Test your connection and get roasted by the ghost of "Mas-Mas IT".
              </p>

              <motion.button
                onClick={runTest}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-white blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-white text-black font-black text-3xl flex items-center justify-center tracking-tighter shadow-2xl transition-transform">
                  GO
                </div>
                {/* Orbital Elements */}
                <motion.div 
                  className="absolute w-48 h-48 md:w-56 md:h-56 border border-zinc-800 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
              </motion.button>

              <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16">
                <Feature icon={<Globe className="w-4 h-4" />} text="100% Client Side" />
                <Feature icon={<Activity className="w-4 h-4" />} text="Network+ Verified" />
                <Feature icon={<Zap className="w-4 h-4" />} text="Real-time Roasting" />
              </div>
            </motion.div>
          )}

          {(state === "PREPARING" || state === "TESTING") && (
            <motion.div
              key="testing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-12 w-full"
            >
              <div className="mb-12 flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-500 animate-pulse">
                  {state}
                </span>
                <h3 className="text-xl font-mono text-zinc-400">{testPhase}</h3>
              </div>

              <Gauge speed={speed} isTesting={state === "TESTING"} />

              <div className="mt-16 w-full max-w-sm space-y-4">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase text-zinc-500">
                  <span>Downlink Integrity</span>
                  <span>{Math.floor(speed * 1.5)}%</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500" 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (speed / 100) * 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {state === "RESULT" && networkInfo && roast && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-12 w-full"
            >
              <div className="mb-12 flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                  <AlertTriangle className="w-3 h-3" /> Critical Analysis Complete
                </div>
                <h3 className="text-3xl font-black tracking-tighter">THE CYBER RECEIPT</h3>
                <p className="text-zinc-500 text-sm max-w-xs">
                  {getISPJoke(networkInfo.isp)}
                </p>
              </div>

              <CyberReceipt info={networkInfo} roast={roast} />

              <button
                onClick={() => {
                  setState("IDLE");
                  setSpeed(0);
                }}
                className="mt-12 text-zinc-500 hover:text-white flex items-center gap-2 transition-colors uppercase text-[10px] tracking-widest font-bold"
              >
                <Activity className="w-4 h-4" /> Reset Profiler
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Branding */}
      <footer className="w-full py-8 border-t border-zinc-900/50 mt-auto flex flex-col items-center opacity-50">
        <p className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
          MADE WITH ATTITUDE BY <span className="bg-white text-black px-1">OKELAH</span>
        </p>
      </footer>
    </div>
  );
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-zinc-600 mb-1">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 whitespace-nowrap">{text}</span>
    </div>
  );
}
