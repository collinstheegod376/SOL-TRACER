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
} from "lucide-react";
import { cn } from "@/lib/utils";

export type QueryClassification = "LOOKUP" | "ENRICHMENT" | "AGGREGATION" | "CONVERSATIONAL" | "FLOW_DIAGRAM" | "SECURITY_AUDIT" | "DEX_TRADES" | "MULTI_HOP" | "TOKEN_INTEL" | "DEV_DOSSIER" | "BUNDLE_CHECK";

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
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  LOOKUP: {
    label: "LOOKUP",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  ENRICHMENT: {
    label: "ENRICHMENT",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  AGGREGATION: {
    label: "AGGREGATION",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  FLOW_DIAGRAM: {
    label: "FLOW MAP",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  SECURITY_AUDIT: {
    label: "SECURITY",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  DEX_TRADES: {
    label: "DEX TRADES",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  MULTI_HOP: {
    label: "MULTI-HOP",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  TOKEN_INTEL: {
    label: "TOKEN INTEL",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  DEV_DOSSIER: {
    label: "DEV DOSSIER",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
  },
  BUNDLE_CHECK: {
    label: "BUNDLE AUDIT",
    bg: "bg-[#F4F4F4]",
    text: "text-[#0D0D0D]",
    border: "border-[#E5E7EB]",
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
        "w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl text-xs overflow-hidden my-2",
        className
      )}
    >
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-[#F0F2F5] transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Terminal className="w-3.5 h-3.5 text-[#5D5D5D]" />
          <span className="font-semibold text-[#0D0D0D]">
            Execution Trace
          </span>

          {/* Classification Pill Badge */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border",
              badgeConfig.bg,
              badgeConfig.text,
              badgeConfig.border
            )}
          >
            {badgeConfig.label}
          </span>

          <span className="text-[#5D5D5D] text-[11px] font-mono">
            {toolCalls.length} tool {toolCalls.length === 1 ? "call" : "calls"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-mono text-[11px] text-[#5D5D5D]">
            <Clock className="w-3 h-3 text-[#8F8F8F]" />
            <span>{calculatedTotal}ms</span>
          </div>

          <div className="text-[#5D5D5D]">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-[#0D0D0D]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#5D5D5D]" />
            )}
          </div>
        </div>
      </button>

      {/* Accordion Content Body */}
      {isOpen && (
        <div className="border-t border-[#E5E7EB] bg-[#FFFFFF] divide-y divide-[#F0F2F5]">
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
                    <span className="font-mono text-[10px] text-[#8F8F8F] w-4">
                      {idx + 1}.
                    </span>

                    {call.status === "success" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    )}
                    {call.status === "running" && (
                      <Loader2 className="w-3.5 h-3.5 text-[#0D0D0D] animate-spin shrink-0" />
                    )}
                    {call.status === "error" && (
                      <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                    )}

                    <span className="font-mono font-medium text-[#0D0D0D] group-hover:text-[#5D5D5D] transition-colors">
                      {call.toolName}
                    </span>

                    {call.summary && (
                      <span className="text-[11px] text-[#5D5D5D] truncate hidden sm:inline">
                        — {call.summary}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-[#8F8F8F]">
                      {call.durationMs}ms
                    </span>
                    <span className="text-[#5D5D5D] text-[10px] hover:text-[#0D0D0D]">
                      {isCallExpanded ? "less" : "details"}
                    </span>
                  </div>
                </div>

                {/* Expanded Parameter & Output Preview */}
                {isCallExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-[#F0F2F5] pl-6 space-y-2">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#5D5D5D] mb-1">
                        Parameters
                      </div>
                      <pre className="bg-[#F8F9FA] p-2 rounded-lg border border-[#E5E7EB] text-[11px] font-mono text-[#0D0D0D] overflow-x-auto">
                        {JSON.stringify(call.parameters, null, 2)}
                      </pre>
                    </div>

                    {call.outputPreview && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[#5D5D5D] mb-1">
                          Result Payload
                        </div>
                        <pre className="bg-[#F8F9FA] p-2 rounded-lg border border-[#E5E7EB] text-[11px] font-mono text-[#0D0D0D] overflow-x-auto max-h-40">
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
