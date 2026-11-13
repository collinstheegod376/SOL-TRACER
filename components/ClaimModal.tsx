"use client";

import React, { useEffect, useState } from "react";
import { X, Gift } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWallet?: string;
}

type Lookup = {
  eligible: boolean;
  status: "eligible" | "claimed" | "sent" | "not_eligible";
  sol: string;
  lossSol: string;
  message: string;
  signature: string;
};

export function ClaimModal({ isOpen, onClose, activeWallet }: ClaimModalProps) {
  const [address, setAddress] = useState(activeWallet ?? "");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Lookup | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setAddress(activeWallet ?? "");
      setResult(null);
      setError("");
    }
  }, [isOpen, activeWallet]);

  if (!isOpen) return null;

  async function lookup() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/rebate?wallet=${encodeURIComponent(address.trim())}`, { cache: "no-store" });
      const text = await response.text();
      const body = JSON.parse(text) as Lookup & { error?: string };
      if (!response.ok) {
        setError(body.error || "Could not read the eligibility list.");
        return;
      }
      setResult(body);
    } catch {
      setError("Could not read the eligibility list.");
    } finally {
      setLoading(false);
    }
  }

  async function claim() {
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/rebate/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address.trim() }),
        cache: "no-store",
      });
      const text = await response.text();
      const body = JSON.parse(text) as Lookup & { error?: string };
      if (!response.ok) {
        setError(body.error || "Could not save the claim.");
        return;
      }
      setResult(body);
    } catch {
      setError("Could not save the claim.");
    } finally {
      setSending(false);
    }
  }

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
        onClick={(event) => event.stopPropagation()}
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
        <div className="mt-1 text-sm text-[#5D5D5D] leading-relaxed space-y-1">
          <p>Eligible means you sold this token at a loss of at least $5. A bigger loss gets a bigger share of the vault.</p>
        </div>

        <label className="mt-4 block text-xs font-medium text-[#5D5D5D]" htmlFor="claim-address">
          Address
        </label>
        <input
          id="claim-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          spellCheck={false}
          className="mt-1 w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-[#F4F4F4] text-xs font-mono text-[#0D0D0D]"
          placeholder="Solana address"
        />

        {activeWallet && (
          <div className="mt-2 text-[11px] text-[#5D5D5D]">Wallet in context: {shortenAddress(activeWallet, 4)}</div>
        )}

        <button
          type="button"
          onClick={lookup}
          disabled={loading || address.trim().length < 32}
          className="mt-4 w-full h-11 rounded-full bg-[#0D0D0D] text-white text-sm font-medium hover:bg-[#262626] transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? "Checking…" : "Check rebate"}
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {result && !result.eligible && (
          <div className="mt-3">
            <p className="text-sm font-medium text-[#0D0D0D]">Not eligible.</p>
            <p className="mt-1 text-sm text-[#5D5D5D]">This address is not in the snapshot.</p>
          </div>
        )}

        {result?.eligible && (
          <div className="mt-3">
            <p className="text-sm font-medium text-[#0D0D0D]">{result.message}</p>
            <p className="mt-1 text-lg font-semibold text-[#0D0D0D]">{result.sol} SOL</p>
            <p className="mt-1 text-sm text-[#5D5D5D]">
              Loss {result.lossSol} SOL. A larger loss gets a larger share of the vault.
            </p>
            {result.status === "eligible" && (
              <button
                type="button"
                onClick={claim}
                disabled={sending}
                className="mt-3 w-full h-11 rounded-full border border-[#E5E7EB] text-sm font-medium cursor-pointer disabled:opacity-50"
              >
                {sending ? "Saving…" : "Claim"}
              </button>
            )}
            {result.status === "sent" && result.signature && (
              <a
                className="mt-2 inline-block text-sm underline"
                href={`https://solscan.io/tx/${result.signature}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Solscan
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
