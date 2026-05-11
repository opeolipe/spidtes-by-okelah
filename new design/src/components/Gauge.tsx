/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { useMemo } from "react";

interface GaugeProps {
  speed: number; // 0 to 100
  isTesting: boolean;
}

export default function Gauge({ speed, isTesting }: GaugeProps) {
  // Map speed 0-100 to rotation -120 to 120 degrees
  const rotation = useMemo(() => {
    return (speed / 100) * 240 - 120;
  }, [speed]);

  return (
    <div className="relative flex flex-col items-center justify-center w-64 h-64 md:w-80 md:h-80">
      {/* Background Track */}
      <svg className="absolute w-full h-full transform -rotate-120" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="8"
          strokeDasharray="180 282"
          strokeLinecap="round"
        />
        {/* Progress Track */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={speed > 80 ? "#22c55e" : speed > 40 ? "#eab308" : "#ef4444"}
          strokeWidth="8"
          strokeDasharray={`${(speed / 100) * 180} 282`}
          strokeLinecap="round"
          initial={{ strokeDasharray: "0 282" }}
          animate={{ strokeDasharray: `${(speed / 100) * 180} 282` }}
          transition={{ type: "spring", stiffness: 50, damping: 10 }}
        />
      </svg>

      {/* Needle */}
      <motion.div
        className="absolute w-1 h-32 md:h-40 bg-red-500 origin-bottom left-1/2 -ml-[2px] bottom-1/2 z-10 rounded-full"
        animate={{ rotate: rotation }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        style={{
          boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)",
        }}
      />
      
      {/* Center Cap */}
      <div className="absolute w-6 h-6 bg-zinc-800 border-4 border-zinc-700 rounded-full z-20 shadow-xl" />

      {/* Speed Display */}
      <div className="mt-20 flex flex-col items-center z-30">
        <motion.span 
          className="text-6xl md:text-7xl font-mono font-bold tracking-tighter text-white"
          animate={{ scale: isTesting ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          {speed.toFixed(1)}
        </motion.span>
        <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">Mbps</span>
      </div>

      {/* Ticks */}
      {[0, 20, 40, 60, 80, 100].map((tick) => {
        const tickRot = (tick / 100) * 240 - 120;
        return (
          <div
            key={tick}
            className="absolute text-[10px] font-mono text-zinc-600"
            style={{
              transform: `rotate(${tickRot}deg) translateY(-110px) rotate(${-tickRot}deg)`,
              left: "48%",
              bottom: "48%",
            }}
          >
            {tick}
          </div>
        );
      })}
    </div>
  );
}
