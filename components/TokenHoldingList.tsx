"use client";

import React, { useState } from "react";
import { Coins, ExternalLink, DollarSign } from "lucide-react";
import { shortenAddress, formatNumber, formatCurrency, cn } from "@/lib/utils";

export interface TokenHolding {
  mint: string;
  name: string;
  symbol: string;
  icon?: string;
  amount: number;
  decimals: number;
  priceUsd: number;
  change24h?: number;
  usdValue: number;
}

interface TokenHoldingListProps {
  tokens: TokenHolding[];
  solBalance?: number;
  solPriceUsd?: number;
  className?: string;
}

export function TokenHoldingList({
  tokens,
  solBalance,
  solPriceUsd = 145.5,
  className,
}: TokenHoldingListProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const solUsdValue = (solBalance ?? 0) * solPriceUsd;
  const tokensUsdTotal = tokens.reduce((acc, t) => acc + (t.usdValue || 0), 0);
  const totalPortfolioValue = solUsdValue + tokensUsdTotal;

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.mint.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div
      className={cn(
        "w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl overflow-hidden my-3 shadow-xs",
        className
      )}
    >
      {/* Portfolio Header Banner */}
      <div className="p-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 bg-[#F8F9FA]">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#5D5D5D]">
            <DollarSign className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Estimated Portfolio Value</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#0D0D0D] mt-0.5 tracking-tight">
            {formatCurrency(totalPortfolioValue)}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          {solBalance !== undefined && (
            <div className="flex flex-col items-end">
              <span className="text-[#5D5D5D] text-[10px]">SOL Balance</span>
              <span className="text-[#0D0D0D] font-medium">
                {formatNumber(solBalance, { maxDecimals: 3 })} SOL
              </span>
              <span className="text-[10px] text-[#8F8F8F]">
                ({formatCurrency(solUsdValue)})
              </span>
            </div>
          )}
          <div className="flex flex-col items-end border-l border-[#E5E7EB] pl-4">
            <span className="text-[#5D5D5D] text-[10px]">SPL Assets</span>
            <span className="text-[#0D0D0D] font-medium">
              {tokens.length} tokens
            </span>
            <span className="text-[10px] text-[#8F8F8F]">
              ({formatCurrency(tokensUsdTotal)})
            </span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar if many tokens */}
      {tokens.length > 4 && (
        <div className="px-4 py-2 border-b border-[#E5E7EB] bg-[#FFFFFF]">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter holdings by name or symbol..."
            className="w-full bg-[#F4F4F4] text-xs font-mono text-[#0D0D0D] placeholder-[#8F8F8F] px-3 py-1.5 rounded-full border border-[#E5E7EB] focus:outline-none focus:border-[#0D0D0D]"
          />
        </div>
      )}

      {/* Responsive Holdings List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#FFFFFF] text-[11px] font-medium text-[#5D5D5D]">
              <th className="px-3.5 py-2.5">Asset</th>
              <th className="px-3.5 py-2.5 text-right">Balance</th>
              <th className="px-3.5 py-2.5 text-right">Price</th>
              <th className="px-3.5 py-2.5 text-right">Value (USD)</th>
              <th className="px-3.5 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F2F5]">
            {filteredTokens.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-xs text-[#8F8F8F]">
                  No token holdings found
                </td>
              </tr>
            ) : (
              filteredTokens.map((t) => (
                <tr
                  key={t.mint}
                  className="hover:bg-[#F8F9FA] transition-colors group"
                >
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#F4F4F4] border border-[#E5E7EB] flex items-center justify-center font-mono text-[10px] font-bold text-[#0D0D0D] shrink-0">
                        {t.symbol.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs text-[#0D0D0D]">
                          {t.symbol}
                        </span>
                        <span className="text-[10px] text-[#5D5D5D] truncate max-w-[120px]">
                          {t.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-3.5 py-2.5 text-right font-mono font-medium text-[#0D0D0D]">
                    {formatNumber(t.amount, { maxDecimals: 4 })}
                  </td>

                  <td className="px-3.5 py-2.5 text-right font-mono text-[#5D5D5D]">
                    {t.priceUsd > 0 ? formatCurrency(t.priceUsd) : "—"}
                  </td>

                  <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#0D0D0D]">
                    {t.usdValue > 0 ? formatCurrency(t.usdValue) : "—"}
                  </td>

                  <td className="px-3.5 py-2.5 text-center">
                    <a
                      href={`https://solscan.io/token/${t.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-[#E5E7EB] rounded text-[#8F8F8F] hover:text-[#0D0D0D] transition-colors inline-block"
                      title="View token on Solscan"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
