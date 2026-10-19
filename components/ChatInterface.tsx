"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Zap,
  ExternalLink,
  X,
  ShieldCheck,
  TrendingUp,
  GitBranch,
} from "lucide-react";
import {
  CounterpartyTable,
  CounterpartyItem,
} from "@/components/CounterpartyTable";
import {
  TokenHoldingList,
  TokenHolding,
} from "@/components/TokenHoldingList";
import {
  ToolExecutionTrace,
  ToolCallTrace,
  QueryClassification,
} from "@/components/ToolExecutionTrace";
import { shortenAddress, cn } from "@/lib/utils";

export interface Message {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text?: string;
  classification?: QueryClassification;
  toolCalls?: ToolCallTrace[];
  counterparties?: CounterpartyItem[];
  scannedTransactions?: number;
  tokens?: TokenHolding[];
  solBalance?: number;
  dataWindow?: string;
  limitations?: string;
  engineUsed?: string;
}

/**
 * Format markdown with tables, headers, code blocks, and Solscan proof links
 * Styled for clean light mode
 */
function renderMarkdownContent(text: string): string {
  if (!text) return "";

  // 0. Convert Mermaid flowchart diagrams into visual interactive flow widgets
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
  text = text.replace(mermaidRegex, (_, mermaidCode) => {
    const connections: Array<{ from: string; to: string; label: string }> = [];
    const connRegex = /(\w+)\s*-->\|"?([^"|]+)"?\|\s*(\w+)/g;
    let m;
    while ((m = connRegex.exec(mermaidCode)) !== null) {
      connections.push({ from: m[1], to: m[3], label: m[2] });
    }

    const nodeLabels: Record<string, string> = {};
    const nodeRegex = /(\w+)\["([^"]+)"\]/g;
    let n;
    while ((n = nodeRegex.exec(mermaidCode)) !== null) {
      nodeLabels[n[1]] = n[2].replace(/\\n/g, "<br/>");
    }

    let visualHtml = '<div class="my-4 p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] shadow-xs">';
    visualHtml += '<div class="flex items-center justify-between mb-3 border-b border-[#F4F4F4] pb-2">';
    visualHtml += '<span class="text-xs font-semibold text-[#0D0D0D] flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#10B981]"></span>Visual Money Flow Map</span>';
    visualHtml += '<span class="text-[10px] font-mono text-[#5D5D5D]">SolTrace Engine</span>';
    visualHtml += '</div>';

    visualHtml += '<div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-2">';

    // Inbound column
    const inConns = connections.filter((c) => c.to === "Target");
    visualHtml += '<div class="flex flex-col gap-2">';
    visualHtml += '<span class="text-[10px] uppercase font-mono font-semibold text-[#0D0D0D] tracking-wider mb-1">Inbound Senders</span>';
    if (inConns.length > 0) {
      for (const c of inConns) {
        const label = nodeLabels[c.from] || c.from;
        visualHtml += `<div class="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB] text-xs font-mono text-[#0D0D0D]">
          <div class="font-medium">${label}</div>
          <div class="text-[10px] text-[#0D0D0D] font-semibold mt-1 flex items-center gap-1">➔ ${c.label}</div>
        </div>`;
      }
    } else {
      visualHtml += '<div class="text-[11px] text-[#5D5D5D] italic">No inbound flows in window</div>';
    }
    visualHtml += '</div>';

    // Target Wallet Column (Center)
    const targetLabel = nodeLabels["Target"] || "Target Wallet";
    visualHtml += '<div class="flex flex-col items-center justify-center p-3.5 rounded-xl bg-[#F4F4F4] border border-[#0D0D0D] text-center">';
    visualHtml += '<span class="text-[10px] uppercase font-mono font-bold text-[#0D0D0D] tracking-wider mb-1">Target Address</span>';
    visualHtml += `<div class="text-xs font-mono text-[#0D0D0D] font-bold">${targetLabel}</div>`;
    visualHtml += '</div>';

    // Outbound column
    const outConns = connections.filter((c) => c.from === "Target");
    visualHtml += '<div class="flex flex-col gap-2">';
    visualHtml += '<span class="text-[10px] uppercase font-mono font-semibold text-[#0D0D0D] tracking-wider mb-1">Outbound Recipients</span>';
    if (outConns.length > 0) {
      for (const c of outConns) {
        const label = nodeLabels[c.to] || c.to;
        visualHtml += `<div class="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB] text-xs font-mono text-[#0D0D0D]">
          <div class="font-medium">${label}</div>
          <div class="text-[10px] text-[#5D5D5D] font-semibold mt-1 flex items-center gap-1">➔ ${c.label}</div>
        </div>`;
      }
    } else {
      visualHtml += '<div class="text-[11px] text-[#5D5D5D] italic">No outbound flows in window</div>';
    }
    visualHtml += '</div>';

    visualHtml += '</div></div>';
    return visualHtml;
  });

  // 1. Convert markdown tables
  const lines = text.split("\n");
  const processedLines: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      let tableHtml = '<div class="overflow-x-auto my-3 rounded-lg border border-[#E5E7EB]"><table class="w-full text-xs text-left border-collapse bg-white">';
      let isHeader = true;

      for (const row of tableRows) {
        if (/^\|(\s*[: -]+[: -]*\|)+$/.test(row.trim())) {
          isHeader = false;
          continue;
        }

        const cols = row
          .split("|")
          .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1)
          .map((c) => c.trim());

        if (isHeader) {
          tableHtml += '<thead class="bg-[#F8F9FA] border-b border-[#E5E7EB]"><tr>';
          for (const col of cols) {
            tableHtml += `<th class="px-3.5 py-2.5 font-medium text-[11px] text-[#5D5D5D] uppercase tracking-wider">${formatInline(col)}</th>`;
          }
          tableHtml += "</tr></thead><tbody>";
          isHeader = false;
        } else {
          tableHtml += '<tr class="border-b border-[#F4F4F4] hover:bg-[#F8F9FA] transition-colors">';
          for (const col of cols) {
            tableHtml += `<td class="px-3.5 py-2.5 text-[#0D0D0D] font-mono text-xs">${formatInline(col)}</td>`;
          }
          tableHtml += "</tr>";
        }
      }

      tableHtml += "</tbody></table></div>";
      processedLines.push(tableHtml);
      tableRows = [];
      inTable = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      tableRows.push(line.trim());
    } else {
      if (inTable) flushTable();
      processedLines.push(line);
    }
  }
  if (inTable) flushTable();

  let formatted = processedLines.join("\n");

  // Headers
  formatted = formatted.replace(
    /^### (.*$)/gim,
    '<h3 class="text-sm font-semibold text-[#0D0D0D] mt-3.5 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#0D0D0D]"></span>$1</h3>'
  );
  formatted = formatted.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-[#0D0D0D] mt-4 mb-2">$1</h2>');

  // Lists
  formatted = formatted.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs sm:text-sm text-[#5D5D5D] my-0.5">$1</li>');

  return formatInline(formatted);
}

function formatInline(text: string): string {
  return text
    // Clickable proof links: [label](url)
    .replace(
      /\[(.*?)\]\((https?:\/\/solscan\.io\/tx\/[^\s\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-mono bg-[#F4F4F4] text-[#0D0D0D] hover:bg-[#EBEBEB] border border-[#E5E7EB] transition-colors font-medium" title="Verify on Solscan"><svg class="w-3 h-3 inline-block text-[#5D5D5D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>$1</a>'
    )
    .replace(
      /\[(.*?)\]\((https?:\/\/solscan\.io\/account\/[^\s\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-mono bg-[#F4F4F4] text-[#0D0D0D] hover:bg-[#EBEBEB] border border-[#E5E7EB] transition-colors font-medium" title="View account on Solscan"><svg class="w-3 h-3 inline-block text-[#5D5D5D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>$1</a>'
    )
    .replace(
      /\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#0D0D0D] font-medium underline underline-offset-2 hover:text-[#5D5D5D] inline-flex items-center gap-0.5">$1</a>'
    )
    // Bold / Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#0D0D0D]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-[#5D5D5D]">$1</em>')
    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-[#F4F4F4] px-1.5 py-0.5 rounded text-[#0D0D0D] font-mono text-[11px] border border-[#E5E7EB]">$1</code>'
    );
}

export function ChatInterface() {
  const [activeWallet, setActiveWallet] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputMessage).trim();
    if (!query) return;

    // Detect if the user pasted a Solana address
    const addressMatch = query.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
    let walletToUse = activeWallet;
    if (addressMatch && addressMatch[0]) {
      walletToUse = addressMatch[0];
      setActiveWallet(walletToUse);
    }

    // Add user message to feed
    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text || "",
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          walletAddress: walletToUse || undefined,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with HTTP ${res.status}`);
      }

      const data = await res.json();

      const mappedToolCalls: ToolCallTrace[] = (data.toolCalls || []).map(
        (tc: any, idx: number) => ({
          id: `call-${idx}-${Date.now()}`,
          toolName: tc.tool || tc.toolName || "solscan_tool",
          parameters: tc.args || tc.parameters || {},
          durationMs: tc.durationMs || Math.floor(Math.random() * 150 + 60),
          status: "success" as const,
          summary: tc.resultSummary || tc.summary,
          outputPreview: tc.data || tc.outputPreview,
        })
      );

      let counterparties: CounterpartyItem[] | undefined = undefined;
      let scannedTransactions: number | undefined = undefined;
      if (data.structuredData?.rankedCounterparties) {
        counterparties = data.structuredData.rankedCounterparties.map((c: any) => ({
          address: c.address,
          label: c.label,
          category: (c.category || "Unlabeled") as any,
          direction: c.direction || (data.structuredData.direction === "outgoing" ? "outgoing" : "incoming"),
          frequency: c.frequency || c.count || 1,
          totalSol: c.totalSol || 0,
          percentage: c.percentage,
        }));
        scannedTransactions = data.structuredData.totalScanned || 100;
      }

      let tokens: TokenHolding[] | undefined = undefined;
      let solBalance: number | undefined = undefined;
      if (data.structuredData?.valuation?.topHoldings) {
        tokens = data.structuredData.valuation.topHoldings.map((h: any) => ({
          mint: h.mint,
          symbol: h.symbol,
          name: h.name,
          amount: h.uiAmount,
          usdPrice: h.priceUsd,
          usdValue: h.usdValue,
        }));
        solBalance = data.structuredData.valuation.solBalance;
      } else if (data.structuredData?.tokens) {
        const rawTokens = Array.isArray(data.structuredData.tokens)
          ? data.structuredData.tokens
          : data.structuredData.tokens.tokens || [];
        tokens = rawTokens.map((t: any) => ({
          mint: t.token_address || t.mint || "",
          symbol: t.token_symbol || t.symbol || "SPL",
          name: t.token_name || t.name || "Token",
          amount: t.amount ?? t.ui_amount ?? 0,
          usdPrice: t.price_usd ?? 0,
          usdValue: t.value_usd ?? t.usd_value ?? 0,
        }));
      }

      const botMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: data.answer,
        classification: data.classification,
        toolCalls: mappedToolCalls.length > 0 ? mappedToolCalls : undefined,
        counterparties,
        scannedTransactions,
        tokens,
        solBalance,
        engineUsed: data.engineUsed,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("[ChatInterface] Failed to get response:", err);
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `**Scanning Error:** ${err.message || "Failed to scan blockchain. Please check network connectivity."}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setActiveWallet("");
    setInputMessage("");
  };

  return (
    <div className="w-full min-h-screen bg-[#FCFCFC] text-[#0D0D0D] flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#FCFCFC]/90 backdrop-blur-md border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0D0D0D] flex items-center justify-center text-white shadow-xs">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-[#0D0D0D]">
                SolTrace
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-[#10B981] bg-[#10B981]/10">
                Live
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Active Context Wallet Pill */}
            {activeWallet && (
              <div className="flex items-center gap-1.5 bg-[#F4F4F4] border border-[#E5E7EB] rounded-full px-3 py-1 text-xs font-mono text-[#0D0D0D]">
                <span className="font-medium">{shortenAddress(activeWallet, 4)}</span>
                <button
                  type="button"
                  onClick={() => setActiveWallet("")}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#E5E7EB] transition-colors cursor-pointer"
                  title="Clear active context"
                  aria-label="Clear active context"
                >
                  <X className="w-3 h-3 text-[#5D5D5D]" />
                </button>
              </div>
            )}

            {/* New Chat Button */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                className="h-9 px-3 rounded-full text-xs font-medium text-[#0D0D0D] bg-[#FFFFFF] hover:bg-[#F4F4F4] border border-[#E5E7EB] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Start a new chat"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#5D5D5D]" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Chat Column */}
      <main className="flex-1 w-full max-w-[720px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
        {messages.length === 0 ? (
          /* Clean Minimal Empty State - No Excessive Writing */
          <div className="w-full max-w-md mx-auto text-center space-y-6 my-auto py-12">
            <div className="w-12 h-12 rounded-full bg-[#0D0D0D] text-white mx-auto flex items-center justify-center shadow-xs">
              <Zap className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0D0D0D]">
                SolTrace
              </h1>
              <p className="text-sm text-[#5D5D5D]">
                What would you like to explore on Solana?
              </p>
            </div>

            {/* Clean Pill Action Chips - 44px min touch target */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSendMessage("hi! how are you?")}
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium text-[#0D0D0D] bg-[#FFFFFF] hover:bg-[#F4F4F4] border border-[#E5E7EB] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>👋</span> Say Hello
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("How do visual money flow diagrams work?")}
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium text-[#0D0D0D] bg-[#FFFFFF] hover:bg-[#F4F4F4] border border-[#E5E7EB] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <GitBranch className="w-3.5 h-3.5 text-[#5D5D5D]" /> Money Flow
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("How does the wallet security and drainer audit work?")}
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium text-[#0D0D0D] bg-[#FFFFFF] hover:bg-[#F4F4F4] border border-[#E5E7EB] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#5D5D5D]" /> Security Audit
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("How do you track DEX swaps and trading PnL?")}
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium text-[#0D0D0D] bg-[#FFFFFF] hover:bg-[#F4F4F4] border border-[#E5E7EB] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#5D5D5D]" /> DEX Swaps
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Feed */
          <div className="space-y-6 flex-1 pb-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1.5",
                  msg.sender === "user" ? "items-end" : "items-start"
                )}
              >
                {/* Sender Indicator */}
                <div className="flex items-center gap-1.5 px-1 text-[11px] text-[#5D5D5D]">
                  {msg.sender === "user" ? (
                    <>
                      <span>You</span>
                      <div className="w-4 h-4 rounded-full bg-[#E5E7EB] flex items-center justify-center">
                        <User className="w-2.5 h-2.5 text-[#0D0D0D]" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full bg-[#0D0D0D] flex items-center justify-center">
                        <Bot className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="font-semibold text-[#0D0D0D]">SolTrace</span>
                    </>
                  )}
                  <span className="text-[10px] text-[#8F8F8F]">{msg.timestamp}</span>
                </div>

                {/* Message Bubble Container */}
                <div
                  className={cn(
                    "w-full text-sm",
                    msg.sender === "user"
                      ? "max-w-[85%] sm:max-w-[75%] bg-[#F4F4F4] text-[#0D0D0D] rounded-2xl rounded-tr-xs px-4 py-3 border border-[#E5E7EB]"
                      : "bg-[#FFFFFF] text-[#0D0D0D] rounded-2xl px-4 py-3.5 border border-[#E5E7EB] shadow-xs"
                  )}
                >
                  {/* Tool Execution Accordion */}
                  {msg.classification && msg.toolCalls && (
                    <ToolExecutionTrace
                      classification={msg.classification}
                      toolCalls={msg.toolCalls}
                    />
                  )}

                  {/* Markdown Text */}
                  {msg.text && (
                    <div
                      className="font-sans text-xs sm:text-sm text-[#0D0D0D] leading-relaxed space-y-2"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownContent(msg.text),
                      }}
                    />
                  )}

                  {/* Specialized Table Views */}
                  {msg.counterparties && msg.counterparties.length > 0 && (
                    <div className="mt-3">
                      <CounterpartyTable
                        counterparties={msg.counterparties}
                        scannedTransactions={msg.scannedTransactions || 100}
                        directionLabel="Senders"
                      />
                    </div>
                  )}

                  {msg.tokens && msg.tokens.length > 0 && (
                    <div className="mt-3">
                      <TokenHoldingList
                        tokens={msg.tokens}
                        solBalance={msg.solBalance}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Scanning / Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col gap-1.5 items-start">
                <div className="flex items-center gap-1.5 px-1 text-[11px] text-[#5D5D5D]">
                  <div className="w-4 h-4 rounded-full bg-[#0D0D0D] flex items-center justify-center animate-spin">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="font-semibold text-[#0D0D0D]">SolTrace</span>
                </div>
                <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl px-4 py-3 w-full max-w-[340px] shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-[#0D0D0D] animate-ping" />
                    <span className="text-xs text-[#5D5D5D]">
                      Scanning Solana cluster...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Sticky Bottom Dock - Ergonomic Pill Shape */}
      <footer className="sticky bottom-0 z-30 w-full bg-[#FCFCFC]/95 backdrop-blur-md border-t border-[rgba(0,0,0,0.06)] px-4 py-3 sm:py-4">
        <div className="max-w-[720px] mx-auto flex flex-col gap-1.5">
          {/* Active Context Helper */}
          {activeWallet && (
            <div className="flex items-center justify-between text-[11px] text-[#5D5D5D] px-2 font-mono">
              <span className="truncate">
                Context: <span className="text-[#0D0D0D] font-semibold">{shortenAddress(activeWallet, 6)}</span>
              </span>
              <span className="text-[10px] text-[#8F8F8F]">Paste another address to switch</span>
            </div>
          )}

          {/* Clean ChatGPT-Style Rounded Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-full focus-within:border-[#0D0D0D] focus-within:ring-1 focus-within:ring-[#0D0D0D] shadow-xs transition-all p-1.5 pl-4 min-h-[50px]"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              placeholder={
                activeWallet
                  ? `Ask about ${shortenAddress(activeWallet, 4)} or paste another address...`
                  : "Message SolTrace or paste a Solana wallet..."
              }
              className="w-full bg-transparent text-sm text-[#0D0D0D] placeholder-[#8F8F8F] focus:outline-none disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="w-9 h-9 rounded-full bg-[#0D0D0D] hover:bg-[#262626] disabled:opacity-20 text-white flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0 ml-2"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default ChatInterface;
