"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type QueryClassification = "LOOKUP" | "ENRICHMENT" | "AGGREGATION";

export interface ToolCallTrace {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  durationMs: number;
  status: "success" | "running" | "error";
  summary?: string;
  outputPreview?: any;
}

interface ToolExecutionTraceProps {
  classification: QueryClassification;
  toolCalls: ToolCallTrace[];
  totalDurationMs?: number;
  defaultOpen?: boolean;
  className?: string;
}

const CLASSIFICATION_BADGES: Record<
  QueryClassification,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  LOOKUP: {
    label: "LOOKUP",
    bg: "bg-[#3B82F6]/10",
    text: "text-[#3B82F6]",
    border: "border-[#3B82F6]/30",
    desc: "Single tool point query",
  },
  ENRICHMENT: {
    label: "ENRICHMENT",
    bg: "bg-[#A78BFA]/10",
    text: "text-[#A78BFA]",
    border: "border-[#A78BFA]/30",
    desc: "Multi-tool join & pricing query",
  },
  AGGREGATION: {
    label: "AGGREGATION",
    bg: "bg-[#FBBF24]/10",
    text: "text-[#FBBF24]",
    border: "border-[#FBBF24]/30",
    desc: "Multi-step flow analysis & counterparty ranking",
  },
};

export function ToolExecutionTrace({
  classification,
  toolCalls,
  totalDurationMs,
  defaultOpen = false,
  className,
}: ToolExecutionTraceProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const calculatedTotal =
    totalDurationMs ?? toolCalls.reduce((acc, call) => acc + call.durationMs, 0);

  const badgeConfig = CLASSIFICATION_BADGES[classification] || CLASSIFICATION_BADGES.LOOKUP;

  return (
    <div
      className={cn(
        "w-full bg-[#17181B] border border-[#2A2C31] text-xs transition-all overflow-hidden my-2",
        className
      )}
    >
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#2A2A2D]/30 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Terminal className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="font-semibold text-[#F5F6F8] font-sans">
            Execution Trace
          </span>

          {/* Classification Pill Badge */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border",
              badgeConfig.bg,
              badgeConfig.text,
              badgeConfig.border
            )}
            title={badgeConfig.desc}
          >
            {badgeConfig.label}
          </span>

          <span className="text-[#9AA0AB] text-[11px] font-mono">
            {toolCalls.length} tool {toolCalls.length === 1 ? "call" : "calls"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 font-mono text-[11px] text-[#9AA0AB]">
            <Clock className="w-3 h-3 text-[#9AA0AB]" />
            <span>{calculatedTotal}ms</span>
          </div>

          <div className="text-[#9AA0AB]">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-[#F5F6F8]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#9AA0AB]" />
            )}
          </div>
        </div>
      </button>

      {/* Accordion Content Body */}
      {isOpen && (
        <div className="border-t border-[#2A2C31] bg-[#0F1012]/40 divide-y divide-[#2A2C31]/50">
          {toolCalls.map((call, idx) => {
            const isCallExpanded = selectedCallId === call.id;

            return (
              <div key={call.id} className="p-3">
                <div
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() =>
                    setSelectedCallId(isCallExpanded ? null : call.id)
                  }
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-mono text-[10px] text-[#9AA0AB] w-4">
                      {idx + 1}.
                    </span>

                    {call.status === "success" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                    )}
                    {call.status === "running" && (
                      <Loader2 className="w-3.5 h-3.5 text-[#3B82F6] animate-spin shrink-0" />
                    )}
                    {call.status === "error" && (
                      <AlertCircle className="w-3.5 h-3.5 text-[#F472B6] shrink-0" />
                    )}

                    <span className="font-mono font-medium text-[#F5F6F8] group-hover:text-[#3B82F6] transition-colors">
                      {call.toolName}
                    </span>

                    {call.summary && (
                      <span className="text-[11px] text-[#9AA0AB] truncate hidden sm:inline">
                        — {call.summary}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-[#9AA0AB]">
                      {call.durationMs}ms
                    </span>
                    <span className="text-[#9AA0AB] text-[10px] hover:text-[#F5F6F8]">
                      {isCallExpanded ? "less" : "params"}
                    </span>
                  </div>
                </div>

                {/* Expanded Parameter & Output Preview */}
                {isCallExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-[#2A2C31]/60 pl-6 space-y-2">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#9AA0AB] mb-1">
                        Parameters
                      </div>
                      <pre className="bg-[#17181B] p-2 border border-[#2A2C31] text-[11px] font-mono text-[#F5F6F8] overflow-x-auto">
                        {JSON.stringify(call.parameters, null, 2)}
                      </pre>
                    </div>

                    {call.outputPreview && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[#9AA0AB] mb-1">
                          Result Payload
                        </div>
                        <pre className="bg-[#17181B] p-2 border border-[#2A2C31] text-[11px] font-mono text-[#34D399] overflow-x-auto max-h-40">
                          {typeof call.outputPreview === "string"
                            ? call.outputPreview
                            : JSON.stringify(call.outputPreview, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
