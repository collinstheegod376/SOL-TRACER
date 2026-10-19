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
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  CEX: {
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  System: {
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  Whale: {
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  Unlabeled: {
    bg: "bg-[#F8F9FA]",
    text: "text-[#5D5D5D]",
    border: "border-[#E5E7EB]",
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
        "w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl overflow-hidden my-3 shadow-xs",
        className
      )}
    >
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 bg-[#F8F9FA]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#0D0D0D]">
            {title}
          </span>
          <span className="text-[11px] font-mono text-[#5D5D5D] px-2 py-0.5 rounded-full bg-[#E5E7EB]/60">
            {counterparties.length} ranked
          </span>
        </div>

        {scannedTransactions && (
          <div className="text-[11px] text-[#5D5D5D] font-mono">
            Analyzed {scannedTransactions} transactions
          </div>
        )}
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#FFFFFF] text-[11px] font-medium text-[#5D5D5D]">
              <th className="px-3.5 py-2.5 w-10">#</th>
              <th className="px-3.5 py-2.5">Address / Entity</th>
              <th className="px-3.5 py-2.5">Category</th>
              <th className="px-3.5 py-2.5 text-right">Transactions</th>
              <th className="px-3.5 py-2.5 text-right">Total Volume</th>
              <th className="px-3.5 py-2.5 w-24">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F2F5]">
            {counterparties.map((item, idx) => {
              const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Unlabeled;
              const barWidth = Math.min(
                100,
                Math.max(4, (item.totalSol / maxTotalSol) * 100)
              );

              return (
                <tr
                  key={item.address}
                  className="hover:bg-[#F8F9FA] transition-colors group"
                >
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#8F8F8F]">
                    {idx + 1}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      {item.direction === "incoming" && (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                      )}
                      {item.direction === "outgoing" && (
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                      )}

                      <div className="flex flex-col min-w-0">
                        {item.label ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#0D0D0D] truncate">
                              {item.label}
                            </span>
                            <span className="font-mono text-[10px] text-[#8F8F8F]">
                              ({shortenAddress(item.address, 3)})
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-[#0D0D0D] font-medium">
                            {shortenAddress(item.address, 4)}
                          </span>
                        )}
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.address)}
                          className="p-1 hover:bg-[#E5E7EB] rounded text-[#5D5D5D] hover:text-[#0D0D0D] transition-colors"
                          title="Copy address"
                        >
                          {copiedAddress === item.address ? (
                            <Check className="w-3 h-3 text-[#10B981]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <a
                          href={`https://solscan.io/account/${item.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-[#E5E7EB] rounded text-[#5D5D5D] hover:text-[#0D0D0D] transition-colors"
                          title="View on Solscan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </td>

                  <td className="px-3.5 py-2.5">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border",
                        catStyle.bg,
                        catStyle.text,
                        catStyle.border
                      )}
                    >
                      {item.category}
                    </span>
                  </td>

                  <td className="px-3.5 py-2.5 text-right font-mono font-medium text-[#0D0D0D]">
                    {item.frequency}
                  </td>

                  <td className="px-3.5 py-2.5 text-right font-mono">
                    <div className="font-medium text-[#0D0D0D]">
                      {formatNumber(item.totalSol, { maxDecimals: 3 })} SOL
                    </div>
                  </td>

                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0D0D0D] rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      {item.percentage !== undefined && (
                        <span className="text-[10px] font-mono text-[#5D5D5D]">
                          {item.percentage}%
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
