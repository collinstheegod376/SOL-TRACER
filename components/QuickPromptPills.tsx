"use client";

import React from "react";
import { Coins, Repeat, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickPromptPillsProps {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}

interface PromptOption {
  label: string;
  query: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFAULT_PROMPTS: PromptOption[] = [
  {
    label: "Token Intel",
    query: "Tell me about $GOAT and its market cap, volume, and socials.",
    icon: Coins,
  },
  {
    label: "Bundle & Sniper Audit",
    query: "Is CzLSujWBLFsSjncfkh59rQD4PpHC228h3gkHx9814464 bundled? Check snipers and dev dump.",
    icon: Sparkles,
  },
  {
    label: "Top senders",
    query: "Who sends money to this wallet frequently? Rank top senders with counts and total SOL.",
    icon: Users,
  },
  {
    label: "Portfolio worth",
    query: "What is this wallet's portfolio worth? List token holdings and calculate total USD value.",
    icon: Coins,
  },
  {
    label: "Recent swaps",
    query: "Show recent DeFi swaps and DEX trading activity for this address.",
    icon: Repeat,
  },
];

export function QuickPromptPills({ onSelectPrompt, className }: QuickPromptPillsProps) {
  return (
    <div className={cn("w-full flex flex-wrap gap-2", className)}>
      {DEFAULT_PROMPTS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelectPrompt(item.query)}
            className="min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium text-[#0D0D0D] bg-[#FFFFFF] hover:bg-[#F4F4F4] border border-[#E5E7EB] shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Icon className="w-3.5 h-3.5 text-[#5D5D5D]" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
