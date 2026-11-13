"use client";

import React, { useEffect } from "react";
import { X, Gift } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWallet?: string;
}

export function ClaimModal({ isOpen, onClose, activeWallet }: ClaimModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Claim"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Gift className="w-5 h-5 text-emerald-600" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5D5D5D] hover:bg-[#F4F4F4] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="mt-4 text-lg font-semibold text-[#0D0D0D]">Claim</h2>
        <p className="mt-1 text-sm text-[#5D5D5D] leading-relaxed">
          Claims aren&apos;t live yet. Nothing is being distributed right now, and
          SolTrace will never ask you to sign a transaction or share a seed phrase
          here.
        </p>

        {activeWallet && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-[#F4F4F4] border border-[#E5E7EB] text-xs font-mono text-[#0D0D0D]">
            Wallet in context: {shortenAddress(activeWallet, 4)}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full h-11 rounded-full bg-[#0D0D0D] text-white text-sm font-medium hover:bg-[#262626] transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
