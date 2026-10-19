"use client";

import React from "react";
import {
  ExternalLink,
  Flame,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  Percent,
  Clock,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { TokenFullReport } from "@/lib/pumpfun-engine";

interface PumpTokenCardProps {
  report: TokenFullReport;
}

export function PumpTokenCard({ report }: PumpTokenCardProps) {
  const { intel, bundle, dev, holderConcentration } = report;

  const shortMint = `${intel.mint.slice(0, 4)}...${intel.mint.slice(-4)}`;
  const shortDev = `${dev.creatorAddress.slice(0, 4)}...${dev.creatorAddress.slice(-4)}`;

  const isGraduated = intel.isGraduated;
  const bondingPct = isGraduated ? 100 : intel.bondingCurveProgress || 0;

  return (
    <div className="w-full my-3 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] shadow-xs overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-4 border-b border-[#F0F0F0] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA]/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0D0D0D] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
            {intel.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#0D0D0D] tracking-tight">
                {intel.name}
              </h3>
              <span className="text-xs font-mono font-medium text-[#5D5D5D] px-2 py-0.5 rounded-md bg-[#F0F0F0]">
                ${intel.symbol}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8F8F8F] font-mono mt-0.5">
              <span>CA: {shortMint}</span>
              <a
                href={`https://solscan.io/token/${intel.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#0D0D0D] inline-flex items-center gap-0.5"
                title="View on Solscan"
              >
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {bundle.isBundled ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Bundled ({bundle.bundledPercentage}%)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Clean Launch
            </span>
          )}

          {dev.currentHoldingPercent === 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              <UserCheck className="w-3 h-3 text-teal-600" />
              Dev Sold Out (CTO)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Dev Holds {dev.currentHoldingPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#F0F0F0]">
        <div className="p-3.5 bg-white">
          <span className="text-[11px] text-[#8F8F8F] font-medium block">Price</span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#0D0D0D]">
            ${intel.priceUsd < 0.01 ? intel.priceUsd.toFixed(6) : intel.priceUsd.toFixed(4)}
          </span>
        </div>

        <div className="p-3.5 bg-white">
          <span className="text-[11px] text-[#8F8F8F] font-medium block">Market Cap</span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#0D0D0D]">
            ${intel.marketCapUsd.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 bg-white">
          <span className="text-[11px] text-[#8F8F8F] font-medium block">24h Volume</span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#0D0D0D]">
            ${intel.volume24hUsd.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 bg-white">
          <span className="text-[11px] text-[#8F8F8F] font-medium block">All-Time High</span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#10B981]">
            ${intel.athMarketCapUsd.toLocaleString()} MC
          </span>
        </div>
      </div>

      {/* Bonding Curve Progress Bar */}
      <div className="p-3.5 bg-[#FFFFFF] border-t border-[#F0F0F0]">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium text-[#5D5D5D] flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            {isGraduated ? "Graduation Status" : "Pump.fun Bonding Curve"}
          </span>
          <span className="font-bold text-[#0D0D0D] font-mono">
            {isGraduated ? "🎓 Graduated to Raydium" : `${bondingPct}% Complete`}
          </span>
        </div>
        <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isGraduated ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-orange-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(5, bondingPct))}%` }}
          />
        </div>
      </div>

      {/* Intelligence Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAFAFA] border-t border-[#F0F0F0] text-xs">
        {/* Bundle Card */}
        <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#0D0D0D] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#5D5D5D]" /> Bundle Audit
            </span>
            <span className="font-mono text-[10px] text-[#8F8F8F]">
              Confidence: {bundle.bundleConfidence}
            </span>
          </div>
          <p className="text-[#5D5D5D] leading-relaxed">
            {bundle.verdict}
          </p>
        </div>

        {/* Dev Dossier Card */}
        <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#0D0D0D] flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-[#5D5D5D]" /> Dev Wallet: {shortDev}
            </span>
            <span className="font-mono text-[10px] text-[#8F8F8F]">
              Launches: {dev.totalTokensLaunched}
            </span>
          </div>
          <p className="text-[#5D5D5D] leading-relaxed">
            {dev.reputationSummary}
          </p>
          {dev.fundingSource && (
            <div className="text-[11px] text-[#8F8F8F]">
              Funding: {dev.fundingSource.amountSol} SOL via{" "}
              <span className="text-[#0D0D0D] font-medium">
                {dev.fundingSource.funderLabel || dev.fundingSource.funderAddress.slice(0, 6)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Social Links & Quick Actions Footer */}
      <div className="p-3 bg-[#FFFFFF] border-t border-[#F0F0F0] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {intel.socials.twitter && (
            <a
              href={intel.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5D5D5D] hover:text-[#0D0D0D] underline underline-offset-2 flex items-center gap-1"
            >
              Twitter/X
            </a>
          )}
          {intel.socials.telegram && (
            <a
              href={intel.socials.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5D5D5D] hover:text-[#0D0D0D] underline underline-offset-2 flex items-center gap-1"
            >
              Telegram
            </a>
          )}
          {intel.socials.website && (
            <a
              href={intel.socials.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5D5D5D] hover:text-[#0D0D0D] underline underline-offset-2 flex items-center gap-1"
            >
              Website
            </a>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {intel.pumpfunUrl && (
            <a
              href={intel.pumpfunUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F4F4F4] text-[#0D0D0D] hover:bg-[#EBEBEB] border border-[#E5E7EB] transition-colors"
            >
              Pump.fun
            </a>
          )}
          <a
            href={intel.dexscreenerUrl || `https://dexscreener.com/solana/${intel.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#0D0D0D] text-white hover:bg-black transition-colors flex items-center gap-1"
          >
            DexScreener <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
