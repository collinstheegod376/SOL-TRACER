"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { shortenAddress, formatNumber, cn } from "@/lib/utils";

export type CounterpartyCategory = "DEX" | "CEX" | "System" | "Whale" | "Unlabeled";

export interface CounterpartyItem {
  address: string;
  label?: string;
  category: CounterpartyCategory;
  direction?: "incoming" | "outgoing" | "bidirectional";
  frequency: number;
  totalSol: number;
  percentage?: number;
}

interface CounterpartyTableProps {
  title?: string;
  counterparties: CounterpartyItem[];
  scannedTransactions?: number;
  directionLabel?: "Senders" | "Receivers" | "Counterparties";
  className?: string;
}

const CATEGORY_STYLES: Record<
  CounterpartyCategory,
  { bg: string; text: string; border: string }
> = {
  DEX: {
    bg: "bg-[#A78BFA]/10",
    text: "text-[#A78BFA]",
    border: "border-[#A78BFA]/30",
  },
  CEX: {
    bg: "bg-[#FBBF24]/10",
    text: "text-[#FBBF24]",
    border: "border-[#FBBF24]/30",
  },
  System: {
    bg: "bg-[#34D399]/10",
    text: "text-[#34D399]",
    border: "border-[#34D399]/30",
  },
  Whale: {
    bg: "bg-[#3B82F6]/10",
    text: "text-[#3B82F6]",
    border: "border-[#3B82F6]/30",
  },
  Unlabeled: {
    bg: "bg-[#2A2C31]/40",
    text: "text-[#9AA0AB]",
    border: "border-[#2A2C31]",
  },
};

export function CounterpartyTable({
  title = "Top Counterparties",
  counterparties,
  scannedTransactions,
  directionLabel = "Counterparties",
  className,
}: CounterpartyTableProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  const maxTotalSol = Math.max(...counterparties.map((c) => c.totalSol), 1);

  return (
    <div
      className={cn(
        "w-full bg-[#17181B] border border-[#2A2C31] overflow-hidden my-3",
        className
      )}
    >
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-[#2A2C31] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#F5F6F8] tracking-tight">
            {title}
          </span>
          <span className="text-[11px] font-mono text-[#9AA0AB] px-2 py-0.5 rounded-full bg-[#2A2C31]/50">
            {counterparties.length} ranked
          </span>
        </div>

        {scannedTransactions && (
          <div className="text-[11px] font-mono text-[#9AA0AB] flex items-center gap-1">
            <span>Window:</span>
            <span className="text-[#F5F6F8]">{formatNumber(scannedTransactions)} txs</span>
          </div>
        )}
      </div>

      {/* Counterparty List / Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2A2C31] text-[11px] uppercase tracking-wider text-[#9AA0AB] bg-[#0F1012]/40">
              <th className="py-2.5 px-3 font-medium w-10 text-center">#</th>
              <th className="py-2.5 px-3 font-medium">Address & Label</th>
              <th className="py-2.5 px-3 font-medium">Category</th>
              <th className="py-2.5 px-3 font-medium text-right">Frequency</th>
              <th className="py-2.5 px-3 font-medium text-right">Total SOL</th>
              <th className="py-2.5 px-3 font-medium w-24">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2C31]/60 text-xs">
            {counterparties.map((item, index) => {
              const categoryStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Unlabeled;
              const percent = item.percentage ?? Math.round((item.totalSol / maxTotalSol) * 100);

              return (
                <tr
                  key={item.address}
                  className="hover:bg-[#2A2A2D]/30 transition-colors group"
                >
                  {/* Rank */}
                  <td className="py-3 px-3 text-center font-mono text-[#9AA0AB] text-[11px]">
                    {index + 1}
                  </td>

                  {/* Address & Label */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.address)}
                          title="Click to copy address"
                          className="font-mono text-xs text-[#F5F6F8] hover:text-[#3B82F6] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>{shortenAddress(item.address, 4)}</span>
                          {copiedAddress === item.address ? (
                            <Check className="w-3 h-3 text-[#34D399]" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-[#9AA0AB] opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                        <a
                          href={`https://solscan.io/account/${item.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on Solscan"
                          className="text-[#9AA0AB] hover:text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      {item.label && (
                        <span className="text-[11px] text-[#9AA0AB] truncate max-w-[180px]">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Label / Badge */}
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border",
                        categoryStyle.bg,
                        categoryStyle.text,
                        categoryStyle.border
                      )}
                    >
                      {item.direction === "incoming" && (
                        <ArrowDownLeft className="w-2.5 h-2.5 text-[#34D399]" />
                      )}
                      {item.direction === "outgoing" && (
                        <ArrowUpRight className="w-2.5 h-2.5 text-[#F472B6]" />
                      )}
                      {item.category}
                    </span>
                  </td>

                  {/* Frequency count */}
                  <td className="py-3 px-3 text-right font-mono text-[#F5F6F8]">
                    {formatNumber(item.frequency)}
                    <span className="text-[10px] text-[#9AA0AB] ml-1">txs</span>
                  </td>

                  {/* Total SOL */}
                  <td className="py-3 px-3 text-right font-mono text-[#F5F6F8] font-medium">
                    {formatNumber(item.totalSol, { maxDecimals: 3 })}
                    <span className="text-[10px] text-[#9AA0AB] ml-1">SOL</span>
                  </td>

                  {/* Percentage bar */}
                  <td className="py-3 px-3">
                    <div className="w-full flex items-center gap-2">
                      <div className="flex-1 bg-[#2A2C31] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#3B82F6] h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-[#9AA0AB] w-7 text-right">
                        {percent}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer disclaimer / context */}
      <div className="px-4 py-2 border-t border-[#2A2C31] bg-[#0F1012]/30 flex items-center justify-between text-[11px] text-[#9AA0AB]">
        <span>Direction based on net post/pre balance changes</span>
        <span className="font-mono">{counterparties.length} entries shown</span>
      </div>
    </div>
  );
}
