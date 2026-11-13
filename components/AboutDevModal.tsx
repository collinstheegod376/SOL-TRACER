"use client";

import React, { useEffect } from "react";
import { X, Globe, ExternalLink, Zap } from "lucide-react";

interface AboutDevModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDevModal({ isOpen, onClose }: AboutDevModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dev-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#F4F4F4] flex items-center justify-between">
          <h2
            id="about-dev-title"
            className="text-base sm:text-lg font-semibold text-[#0D0D0D] tracking-tight"
          >
            About Developer
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5D5D5D] hover:text-[#0D0D0D] hover:bg-[#F4F4F4] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Identity */}
          <div className="flex items-center gap-4">
            {/* Avatar with fallback */}
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#0D0D0D] border border-[#E5E7EB] shrink-0 flex items-center justify-center text-white shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nerfed_killua.png"
                alt="nerfed_killua"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-sm font-mono font-bold tracking-wider text-emerald-400">NK</span>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-[#0D0D0D] tracking-tight">
                nerfed_killua
              </div>
              <p className="text-xs text-[#5D5D5D] mt-0.5">Creator of SolTrace</p>
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] shadow-xs space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#0D0D0D] font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> How Sol Tracer works
            </div>
            <p className="text-xs sm:text-sm text-[#0D0D0D] leading-relaxed">
              Paste a Solana token address, ticker, or wallet and ask a question in
              plain English. Sol Tracer pulls live data from the Solana network and
              market sources, then checks things like market cap, liquidity,
              bundled or sniped supply, dev wallet activity, top holders, and mint
              and liquidity safety.
            </p>
            <p className="text-xs sm:text-sm text-[#5D5D5D] leading-relaxed">
              An AI model turns that data into a short, direct answer to exactly
              what you asked. Ask for a report or breakdown any time and you get
              the full detail with proof links you can verify yourself.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-2.5">
            <a
              href="https://www.promisedkillua.sbs/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FA] border border-[#E5E7EB] hover:border-[#0D0D0D]/20 shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-[#F4F4F4] flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[#0D0D0D]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0D0D0D] flex items-center gap-1.5">
                    Official Website
                    <ExternalLink className="w-3 h-3 text-[#8F8F8F]" />
                  </div>
                  <div className="text-[11px] font-mono text-[#5D5D5D] truncate">
                    https://www.promisedkillua.sbs/
                  </div>
                </div>
              </div>
            </a>

            <a
              href="https://x.com/nerfed_killua"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FA] border border-[#E5E7EB] hover:border-[#0D0D0D]/20 shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-[#0D0D0D] text-white flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0D0D0D] flex items-center gap-1.5">
                    Twitter / X
                    <ExternalLink className="w-3 h-3 text-[#8F8F8F]" />
                  </div>
                  <div className="text-[11px] font-mono text-[#5D5D5D]">
                    @nerfed_killua
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#F4F4F4] bg-[#FAFAFA] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#0D0D0D] text-white hover:bg-[#262626] text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
