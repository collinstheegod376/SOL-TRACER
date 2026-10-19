"use client";

import React from "react";
import { ArrowUpRight, Coins, Repeat, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickPromptPillsProps {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}

interface PromptOption {
  label: string;
  query: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
}

const DEFAULT_PROMPTS: PromptOption[] = [
  {
    label: "Who sends money frequently?",
    query: "Who sends money to this wallet frequently? Rank top senders with counts and total SOL.",
    icon: Users,
    tag: "Aggregation",
  },
  {
    label: "Portfolio net worth",
    query: "What is this wallet's portfolio worth? List token holdings and calculate total USD value.",
    icon: Coins,
    tag: "Enrichment",
  },
  {
    label: "Recent swaps",
    query: "Show recent DeFi swaps and DEX trading activity for this address.",
    icon: Repeat,
    tag: "DeFi",
  },
  {
    label: "SOL balance",
    query: "What is the current SOL balance, account type, and owner program?",
    icon: Sparkles,
    tag: "Lookup",
  },
];

export function QuickPromptPills({ onSelectPrompt, className }: QuickPromptPillsProps) {
  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#9AA0AB]">
        <Sparkles className="w-3 h-3 text-[#3B82F6]" />
        <span>Suggested Inquiries</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEFAULT_PROMPTS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectPrompt(item.query)}
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2A2C31] bg-[#17181B] hover:bg-[#2A2A2D] hover:border-[#3B82F6]/50 text-xs text-[#9AA0AB] hover:text-[#F5F6F8] transition-all duration-150 cursor-pointer shadow-sm"
            >
              <Icon className="w-3.5 h-3.5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
              <span className="font-sans font-medium">{item.label}</span>
              <ArrowUpRight className="w-3 h-3 text-[#9AA0AB] group-hover:text-[#F5F6F8] opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
