"use client";

import React, { useState } from "react";
import { Search, Wallet, X, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { shortenAddress, cn } from "@/lib/utils";

interface WalletInputProps {
  activeWallet: string;
  onWalletChange: (address: string) => void;
  onClearWallet?: () => void;
  className?: string;
}

export function WalletInput({
  activeWallet,
  onWalletChange,
  onClearWallet,
  className,
}: WalletInputProps) {
  const [inputVal, setInputVal] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanAddress = inputVal.trim();
    if (!cleanAddress) return;

    // Simple Solana address check: base58 string 32-44 characters or .sol
    if (cleanAddress.length < 32 && !cleanAddress.endsWith(".sol")) {
      setError("Please enter a valid Solana public key (32-44 chars) or .sol handle");
      return;
    }

    setError(null);
    onWalletChange(cleanAddress);
    setInputVal("");
  };

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      {/* Pinned active wallet pill */}
      {activeWallet && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#17181B] border border-[#2A2C31] text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
            </span>
            <span className="text-[#9AA0AB] uppercase tracking-wider text-[10px] font-semibold">
              Target Wallet:
            </span>
            <button
              type="button"
              onClick={() => handleCopy(activeWallet)}
              title="Click to copy full address"
              className="font-mono text-[#F5F6F8] hover:text-[#3B82F6] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{shortenAddress(activeWallet, 6)}</span>
              {copied ? (
                <Check className="w-3 h-3 text-[#34D399]" />
              ) : (
                <span className="text-[10px] text-[#9AA0AB] hover:underline font-sans">
                  (copy)
                </span>
              )}
            </button>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#9AA0AB] bg-[#2A2C31]/50 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-2.5 h-2.5 text-[#3B82F6]" />
              Pinned
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onClearWallet && (
              <button
                type="button"
                onClick={onClearWallet}
                className="rounded-full px-2 py-0.5 text-[11px] text-[#9AA0AB] hover:text-[#F5F6F8] hover:bg-[#2A2C31] transition-all flex items-center gap-1"
                aria-label="Unpin wallet"
              >
                <X className="w-3 h-3" />
                <span>Unpin</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sharp-cornered input bar with hairline border */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="flex items-center bg-[#17181B] border border-[#2A2C31] rounded-none focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6] transition-all duration-150">
          <div className="pl-3.5 pr-2 text-[#9AA0AB]">
            <Search className="w-4 h-4 text-[#9AA0AB]" />
          </div>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              activeWallet
                ? "Switch target address... (e.g. 5tzFki..., JUP6Lk..., or .sol)"
                : "Enter Solana wallet address to trace (e.g. 5tzFki..., JUP6Lk..., or your wallet)"
            }
            className="w-full bg-transparent py-3 pr-2 text-sm text-[#F5F6F8] placeholder-[#9AA0AB]/60 rounded-none focus:outline-none font-mono"
            aria-label="Solana wallet search"
          />

          {inputVal && (
            <button
              type="button"
              onClick={() => setInputVal("")}
              className="p-1.5 mr-1 text-[#9AA0AB] hover:text-[#F5F6F8] transition-colors"
              aria-label="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Pill submit button */}
          <div className="pr-2 py-1.5 flex items-center">
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="rounded-full bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 disabled:hover:bg-[#3B82F6] text-white text-xs font-medium px-4 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm shrink-0"
            >
              <span>{activeWallet ? "Switch" : "Analyze"}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-1 text-xs text-[#F472B6] font-mono tracking-tight">{error}</p>
        )}
      </form>
    </div>
  );
}
