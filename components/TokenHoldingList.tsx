"use client";

import React, { useState } from "react";
import { Coins, ExternalLink, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
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
        "w-full bg-[#17181B] border border-[#2A2C31] overflow-hidden my-3",
        className
      )}
    >
      {/* Portfolio Header Banner */}
      <div className="p-4 border-b border-[#2A2C31] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#17181B] via-[#1D1F23] to-[#17181B]">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#9AA0AB]">
            <DollarSign className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Estimated Portfolio Value</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F6F8] mt-0.5 tracking-tight">
            {formatCurrency(totalPortfolioValue)}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          {solBalance !== undefined && (
            <div className="flex flex-col items-end">
              <span className="text-[#9AA0AB] text-[10px]">SOL Balance</span>
              <span className="text-[#F5F6F8] font-medium">
                {formatNumber(solBalance, { maxDecimals: 3 })} SOL
              </span>
              <span className="text-[10px] text-[#9AA0AB]">
                ({formatCurrency(solUsdValue)})
              </span>
            </div>
          )}
          <div className="flex flex-col items-end border-l border-[#2A2C31] pl-4">
            <span className="text-[#9AA0AB] text-[10px]">SPL Assets</span>
            <span className="text-[#3B82F6] font-medium">
              {tokens.length} tokens
            </span>
            <span className="text-[10px] text-[#9AA0AB]">
              ({formatCurrency(tokensUsdTotal)})
            </span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      {tokens.length > 4 && (
        <div className="px-4 py-2 border-b border-[#2A2C31] bg-[#0F1012]/40">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by token name, symbol, or mint..."
            className="w-full bg-[#17181B] border border-[#2A2C31] rounded-none px-3 py-1.5 text-xs text-[#F5F6F8] placeholder-[#9AA0AB]/60 focus:outline-none focus:border-[#3B82F6] font-mono"
          />
        </div>
      )}

      {/* Token List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2A2C31] text-[11px] uppercase tracking-wider text-[#9AA0AB] bg-[#0F1012]/20">
              <th className="py-2.5 px-4 font-medium">Asset</th>
              <th className="py-2.5 px-3 font-medium text-right">Holdings</th>
              <th className="py-2.5 px-3 font-medium text-right">Price</th>
              <th className="py-2.5 px-4 font-medium text-right">USD Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2C31]/50 text-xs">
            {filteredTokens.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-[#9AA0AB]">
                  No token holdings found
                </td>
              </tr>
            ) : (
              filteredTokens.map((token) => (
                <tr
                  key={token.mint}
                  className="hover:bg-[#2A2A2D]/30 transition-colors group"
                >
                  {/* Token Icon & Details */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2A2C31] flex items-center justify-center overflow-hidden border border-[#2A2C31] shrink-0 text-[10px] font-bold text-[#F5F6F8]">
                        {token.icon ? (
                          <img
                            src={token.icon}
                            alt={token.symbol}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback on load error
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span>{token.symbol.slice(0, 3)}</span>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#F5F6F8] truncate max-w-[120px]">
                            {token.name}
                          </span>
                          <span className="font-mono text-[11px] text-[#9AA0AB] bg-[#2A2C31]/40 px-1.5 py-0.2 rounded-full">
                            {token.symbol}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[#9AA0AB]">
                          <span>{shortenAddress(token.mint, 3)}</span>
                          <a
                            href={`https://solscan.io/token/${token.mint}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#3B82F6] transition-colors"
                            title="Inspect mint on Solscan"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Token Balance */}
                  <td className="py-3 px-3 text-right">
                    <div className="font-mono text-[#F5F6F8] font-medium">
                      {formatNumber(token.amount, { maxDecimals: 4 })}
                    </div>
                    <div className="text-[10px] text-[#9AA0AB] font-mono">
                      {token.symbol}
                    </div>
                  </td>

                  {/* Token Price */}
                  <td className="py-3 px-3 text-right">
                    <div className="font-mono text-[#F5F6F8]">
                      {token.priceUsd < 0.01
                        ? `$${token.priceUsd.toFixed(6)}`
                        : formatCurrency(token.priceUsd)}
                    </div>
                    {token.change24h !== undefined && (
                      <div
                        className={cn(
                          "text-[10px] font-mono flex items-center justify-end gap-0.5",
                          token.change24h >= 0 ? "text-[#34D399]" : "text-[#F472B6]"
                        )}
                      >
                        {token.change24h >= 0 ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        <span>{token.change24h > 0 ? "+" : ""}{token.change24h.toFixed(1)}%</span>
                      </div>
                    )}
                  </td>

                  {/* USD Value */}
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono text-sm font-semibold text-[#F5F6F8]">
                      {formatCurrency(token.usdValue)}
                    </span>
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
