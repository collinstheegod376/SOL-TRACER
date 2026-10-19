"use client";

import React, { useState } from "react";
import { Search, Wallet, X, Check } from "lucide-react";
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

    if (cleanAddress.length < 32 && !cleanAddress.endsWith(".sol")) {
      setError("Please enter a valid Solana public key (32-44 chars)");
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
      {activeWallet && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#F4F4F4] border border-[#E5E7EB] rounded-full text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
            <span className="text-[#5D5D5D] text-[11px] font-medium">
              Target:
            </span>
            <button
              type="button"
              onClick={() => handleCopy(activeWallet)}
              className="font-mono text-xs text-[#0D0D0D] font-medium hover:underline flex items-center gap-1"
              title="Click to copy address"
            >
              <span>{shortenAddress(activeWallet, 6)}</span>
              {copied && <Check className="w-3 h-3 text-[#10B981]" />}
            </button>
          </div>

          {onClearWallet && (
            <button
              type="button"
              onClick={onClearWallet}
              className="p-1 text-[#8F8F8F] hover:text-[#0D0D0D] hover:bg-[#E5E7EB] rounded-full transition-colors"
              title="Clear target address"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Paste Solana wallet address or .sol domain..."
          className="w-full bg-[#FFFFFF] border border-[#E5E7EB] text-[#0D0D0D] placeholder-[#8F8F8F] text-xs font-mono px-3.5 py-2.5 rounded-full pr-10 focus:outline-none focus:border-[#0D0D0D]"
        />
        <button
          type="submit"
          className="absolute right-1.5 p-1.5 rounded-full bg-[#0D0D0D] text-white hover:bg-[#262626] transition-colors"
          title="Set wallet"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </form>

      {error && <p className="text-[11px] text-[#EF4444] px-2">{error}</p>}
    </div>
  );
}
