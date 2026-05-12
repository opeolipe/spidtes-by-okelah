/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Download, Share2, Shield, Loader2, AlertTriangle } from "lucide-react";
import { NetworkInfo, maskIP } from "../lib/api";
import { RoastResult } from "../lib/roasts";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { checkSession } from "../lib/session";

interface CyberReceiptProps {
  info: NetworkInfo;
  roast: RoastResult;
  /** Token minted by App.tsx after the test — passed here so the component
   *  knows a session was created before the user clicks download. */
  sessionToken: string | null;
}

type ExportState = "idle" | "validating" | "exporting" | "error";

export default function CyberReceipt({ info, roast, sessionToken }: CyberReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!receiptRef.current) return;
    setExportError(null);
    setExportState("validating");

    // --- Session validation ---
    // Without a valid session the backend returns 403. We check here before
    // attempting the (client-side) PNG export so the user gets a clear message
    // rather than silently failing or downloading without authorization.
    if (!sessionToken) {
      setExportState("error");
      setExportError("No active session. Please run a speed test first.");
      return;
    }

    const session = await checkSession();
    if (!session.valid) {
      setExportState("error");
      setExportError(session.error ?? "Session check failed (403). Run a new test to refresh your session.");
      return;
    }

    // --- Generate PNG ---
    setExportState("exporting");
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.download = `spidtes-result-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setExportState("idle");
    } catch (err) {
      console.error("Export failed", err);
      setExportState("error");
      setExportError("Failed to generate image. Please try again.");
    }
  };

  const isLoading = exportState === "validating" || exportState === "exporting";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* The Printable/Shareable Part */}
      <motion.div
        ref={receiptRef}
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="w-full bg-[#fafafa] text-black p-8 font-mono shadow-2xl relative border-t-8 border-black overflow-hidden"
      >
        {/* Satirical Branding */}
        <div className="flex flex-col items-center gap-2 mb-8 border-b-2 border-dashed border-zinc-300 pb-4">
          <h2 className="text-2xl font-black tracking-tighter">SPIDTES by Okelah</h2>
          <p className="text-[10px] uppercase text-zinc-500">Official Roast Receipt • No PII Saved</p>
        </div>

        {/* The Grade - Massive */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Network Grade</span>
            <span className={`text-8xl font-black ${
              roast.grade === "S" ? "text-green-600" :
              roast.grade === "F" ? "text-red-600" : "text-zinc-800"
            }`}>
              {roast.grade}
            </span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Timestamp</span>
            <span className="text-xs">{new Date().toLocaleTimeString()}</span>
            <span className="text-xs">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Network Details */}
        <div className="space-y-3 mb-8">
          <DetailRow label="ISP Provider" value={info.isp} />
          <DetailRow label="Location" value={`${info.city}, ${info.country_code}`} />
          <DetailRow label="Public IPv4" value={maskIP(info.ip)} />
          <DetailRow
            label="Privacy State"
            value={info.is_vpn ? "MASKED (VPN)" : "UNMASKED (Direct)"}
            className={info.is_vpn ? "text-blue-600" : "text-amber-600"}
          />
        </div>

        {/* The Roast */}
        <div className="bg-zinc-100 p-4 border-l-4 border-black mb-6">
          <p className="text-xs font-bold uppercase mb-1">The IT Dept says:</p>
          <p className="text-sm italic leading-tight">"{roast.comment}"</p>
        </div>

        {/* Security Flex */}
        <div className="flex items-center gap-2 pt-4 border-t-2 border-dashed border-zinc-300">
          <Shield className="w-4 h-4" />
          <span className="text-[9px] uppercase tracking-wider font-bold">PII Redaction Engine Active v1.0.4</span>
        </div>

        {/* Decorative Scalloped Bottom (SVG) */}
        <div className="absolute bottom-0 left-0 right-0 h-4 flex overflow-hidden opacity-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="min-w-[40px] h-8 bg-zinc-400 rounded-full -mb-4 mx-[-10px]" />
          ))}
        </div>
      </motion.div>

      {/* Session / export error banner */}
      {exportState === "error" && exportError && (
        <div className="w-full flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 w-full">
        <button
          onClick={handleExport}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-4 rounded-xl font-bold hover:bg-zinc-200 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {exportState === "validating" ? "Checking session..." : "Generating..."}
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Get Receipt
            </>
          )}
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "My Spidtes Roast",
                text: `I got a ${roast.grade} on Spidtes! The IT Dept says: ${roast.comment}`,
                url: window.location.href,
              });
            }
          }}
          className="w-16 flex items-center justify-center bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors shadow-lg border border-zinc-700"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4 border-b border-zinc-200 pb-1">
      <span className="text-[9px] uppercase font-bold text-zinc-400 whitespace-nowrap">{label}</span>
      <span className={`text-[11px] font-bold text-right truncate ${className}`}>{value}</span>
    </div>
  );
}
