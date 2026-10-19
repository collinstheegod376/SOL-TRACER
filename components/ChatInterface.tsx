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
  Search,
  X,
  FileSearch,
  CheckCircle2,
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
      nodeLabels[n[1]] = n[2].replace(/\\n/g, '<br/>');
    }

    let visualHtml = '<div class="my-4 p-4 rounded bg-[#121316] border border-[#2A2C31] shadow-lg">';
    visualHtml += '<div class="flex items-center justify-between mb-3 border-b border-[#2A2C31]/60 pb-2">';
    visualHtml += '<span class="text-xs font-semibold text-[#F5F6F8] flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>Visual Money Flow Map</span>';
    visualHtml += '<span class="text-[10px] font-mono text-[#9AA0AB]">SolTrace Graph Engine</span>';
    visualHtml += '</div>';

    visualHtml += '<div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-2">';

    // Inbound column
    const inConns = connections.filter((c) => c.to === 'Target');
    visualHtml += '<div class="flex flex-col gap-2">';
    visualHtml += '<span class="text-[10px] uppercase font-mono font-semibold text-[#3B82F6] tracking-wider mb-1">Inbound Senders</span>';
    if (inConns.length > 0) {
      for (const c of inConns) {
        const label = nodeLabels[c.from] || c.from;
        visualHtml += `<div class="p-2.5 rounded bg-[#17181B] border border-[#3B82F6]/30 text-xs font-mono text-[#E2E8F0] shadow-xs">
          <div class="font-medium">${label}</div>
          <div class="text-[10px] text-[#3B82F6] mt-1 font-semibold flex items-center gap-1">➔ ${c.label}</div>
        </div>`;
      }
    } else {
      visualHtml += '<div class="text-[11px] text-[#9AA0AB]/60 italic">No inbound flows in window</div>';
    }
    visualHtml += '</div>';

    // Target Wallet Column (Center)
    const targetLabel = nodeLabels['Target'] || 'Target Wallet';
    visualHtml += '<div class="flex flex-col items-center justify-center p-3 rounded bg-[#10B981]/10 border-2 border-[#10B981]/40 text-center shadow-md">';
    visualHtml += '<span class="text-[10px] uppercase font-mono font-bold text-[#10B981] tracking-wider mb-1">Active Target</span>';
    visualHtml += `<div class="text-xs font-mono text-white font-bold">${targetLabel}</div>`;
    visualHtml += '</div>';

    // Outbound column
    const outConns = connections.filter((c) => c.from === 'Target');
    visualHtml += '<div class="flex flex-col gap-2">';
    visualHtml += '<span class="text-[10px] uppercase font-mono font-semibold text-[#F59E0B] tracking-wider mb-1">Outbound Recipients</span>';
    if (outConns.length > 0) {
      for (const c of outConns) {
        const label = nodeLabels[c.to] || c.to;
        visualHtml += `<div class="p-2.5 rounded bg-[#17181B] border border-[#F59E0B]/30 text-xs font-mono text-[#E2E8F0] shadow-xs">
          <div class="font-medium">${label}</div>
          <div class="text-[10px] text-[#F59E0B] mt-1 font-semibold flex items-center gap-1">➔ ${c.label}</div>
        </div>`;
      }
    } else {
      visualHtml += '<div class="text-[11px] text-[#9AA0AB]/60 italic">No outbound flows in window</div>';
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
      let tableHtml = '<div class="overflow-x-auto my-3"><table class="w-full text-xs text-left border-collapse border border-[#2A2C31]">';
      let isHeader = true;

      for (const row of tableRows) {
        // Skip separator row like |:---|:---|
        if (/^\|(\s*[: -]+[: -]*\|)+$/.test(row.trim())) {
          isHeader = false;
          continue;
        }

        const cols = row
          .split("|")
          .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1)
          .map((c) => c.trim());

        if (isHeader) {
          tableHtml += '<thead class="bg-[#17181B] border-b border-[#2A2C31]"><tr>';
          for (const col of cols) {
            tableHtml += `<th class="px-3 py-2 font-mono text-[11px] font-semibold text-[#9AA0AB] uppercase tracking-wider">${formatInline(col)}</th>`;
          }
          tableHtml += "</tr></thead><tbody>";
          isHeader = false;
        } else {
          tableHtml += '<tr class="border-b border-[#2A2C31]/60 hover:bg-[#17181B]/50 transition-colors">';
          for (const col of cols) {
            tableHtml += `<td class="px-3 py-2 text-[#F5F6F8] font-mono text-xs">${formatInline(col)}</td>`;
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
      if (inTable) {
        flushTable();
      }
      processedLines.push(line);
    }
  }
  if (inTable) flushTable();

  let formatted = processedLines.join("\n");

  // Headers
  formatted = formatted.replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-[#F5F6F8] mt-3.5 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>$1</h3>');
  formatted = formatted.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-[#F5F6F8] mt-4 mb-2">$1</h2>');

  // Lists
  formatted = formatted.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs sm:text-sm text-[#9AA0AB] my-0.5">$1</li>');

  // Inline formatting
  return formatInline(formatted);
}

function formatInline(text: string): string {
  return text
    // Clickable proof links: [label](url)
    .replace(
      /\[(.*?)\]\((https?:\/\/solscan\.io\/tx\/[^\s\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono bg-[#3B82F6]/15 text-[#3B82F6] hover:text-[#60A5FA] border border-[#3B82F6]/30 hover:border-[#3B82F6] transition-colors font-medium shadow-xs" title="Verify on Solscan"><svg class="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>$1</a>'
    )
    .replace(
      /\[(.*?)\]\((https?:\/\/solscan\.io\/account\/[^\s\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono bg-[#2A2C31]/70 text-[#F5F6F8] hover:text-[#3B82F6] border border-[#2A2C31] hover:border-[#3B82F6]/50 transition-colors font-medium" title="View account on Solscan"><svg class="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>$1</a>'
    )
    .replace(
      /\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#3B82F6] hover:underline underline-offset-2 inline-flex items-center gap-0.5">$1</a>'
    )
    // Bold / Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#F5F6F8]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-[#9AA0AB]">$1</em>')
    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-[#0F1012] px-1.5 py-0.5 rounded text-[#3B82F6] font-mono text-[11px] border border-[#2A2C31]">$1</code>'
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

    // Detect if the user pasted a Solana address in this query
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

      // Map backend toolCalls to ToolCallTrace[]
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

      // Extract counterparties if structuredData provided
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

      // Extract tokens if structuredData provided
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
        text: `**Scanning Error:** ${err.message || "Failed to scan blockchain. Please verify network connectivity."}`,
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
    <div className="w-full min-h-screen bg-[#0F1012] text-[#F5F6F8] flex flex-col justify-between selection:bg-[#3B82F6]/30">
      {/* Top Fixed Header with Hairline Border */}
      <header className="sticky top-0 z-40 w-full bg-[#0F1012]/90 backdrop-blur-md border-b border-[#2A2C31]">
        <div className="max-w-[672px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-[#F5F6F8] heading-sub">
                  SolTrace
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-medium text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20">
                  Mainnet Live
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Context Wallet Pill if known */}
            {activeWallet && (
              <div className="flex items-center gap-1.5 bg-[#17181B] border border-[#2A2C31] px-2.5 py-1 text-xs font-mono text-[#9AA0AB]">
                <span className="text-[#3B82F6] font-medium">{shortenAddress(activeWallet, 4)}</span>
                <button
                  type="button"
                  onClick={() => setActiveWallet("")}
                  className="hover:text-white transition-colors cursor-pointer"
                  title="Clear active context address"
                >
                  <X className="w-3 h-3 text-[#9AA0AB] hover:text-[#F5F6F8]" />
                </button>
              </div>
            )}

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                className="rounded-full px-2.5 py-1 text-xs text-[#9AA0AB] hover:text-[#F5F6F8] hover:bg-[#17181B] border border-[#2A2C31] transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Clear current session"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">New Scan</span>
              </button>
            )}

            <div className="text-[11px] font-mono text-[#9AA0AB] flex items-center gap-1.5 bg-[#17181B] px-2.5 py-1 rounded-full border border-[#2A2C31]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"></span>
              <span className="hidden sm:inline text-xs">Groq 120B Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Single-Column Centered Layout Container */}
      <main className="flex-1 w-full max-w-[672px] mx-auto px-4 py-6 flex flex-col">
        {/* Empty State Hero or Active Chat Feed */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center py-10 relative">
            {/* Subtle Gradient Glow Background */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="space-y-6 text-center max-w-lg mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2A2C31] bg-[#17181B] text-xs text-[#9AA0AB]">
                <FileSearch className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>AI On-Chain Transaction Scanner</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F6F8] heading-display">
                SolTrace Scanner
              </h1>

              <p className="text-sm text-[#9AA0AB] leading-relaxed">
                Scan any Solana wallet address or transaction signature in natural language. Powered by live on-chain RPC nodes and Groq 120B reasoning with verified Solscan proof links.
              </p>

              <div className="p-4 bg-[#17181B] border border-[#2A2C31] text-left space-y-2 text-xs">
                <div className="text-[#F5F6F8] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                  <span>How to use:</span>
                </div>
                <p className="text-[#9AA0AB] leading-relaxed">
                  Chat naturally with SolTrace! Say hello, ask questions, or paste any Solana wallet address to scan flows, audit security, or decode DEX trades.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 border-t border-[#2A2C31]/50">
                  <button
                    type="button"
                    onClick={() => handleSendMessage("hi! how are you?")}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#2A2C31]/60 hover:bg-[#3B82F6]/20 text-[#F5F6F8] hover:text-[#60A5FA] border border-[#2A2C31] hover:border-[#3B82F6]/40 transition-colors cursor-pointer"
                  >
                    👋 Say Hello
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("What can you do?")}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#2A2C31]/60 hover:bg-[#3B82F6]/20 text-[#F5F6F8] hover:text-[#60A5FA] border border-[#2A2C31] hover:border-[#3B82F6]/40 transition-colors cursor-pointer"
                  >
                    ⚡ Capabilities
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("How do visual money flow diagrams work?")}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#2A2C31]/60 hover:bg-[#3B82F6]/20 text-[#F5F6F8] hover:text-[#60A5FA] border border-[#2A2C31] hover:border-[#3B82F6]/40 transition-colors cursor-pointer"
                  >
                    📊 Visual Flow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("How does the wallet security and drainer audit work?")}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#2A2C31]/60 hover:bg-[#3B82F6]/20 text-[#F5F6F8] hover:text-[#60A5FA] border border-[#2A2C31] hover:border-[#3B82F6]/40 transition-colors cursor-pointer"
                  >
                    🛡️ Security Audit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("How do you track DEX swaps and trading PnL?")}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#2A2C31]/60 hover:bg-[#3B82F6]/20 text-[#F5F6F8] hover:text-[#60A5FA] border border-[#2A2C31] hover:border-[#3B82F6]/40 transition-colors cursor-pointer"
                  >
                    📈 DEX Trades
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 flex-1 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1.5",
                  msg.sender === "user" ? "items-end" : "items-start"
                )}
              >
                {/* Avatar & Sender Badge */}
                <div className="flex items-center gap-2 px-1 text-[11px] font-mono text-[#9AA0AB]">
                  {msg.sender === "user" ? (
                    <>
                      <span>You</span>
                      <div className="w-4 h-4 rounded-full bg-[#2A2C31] flex items-center justify-center">
                        <User className="w-2.5 h-2.5 text-[#F5F6F8]" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full bg-[#3B82F6] flex items-center justify-center">
                        <Bot className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="font-semibold text-[#F5F6F8]">SolTrace</span>
                      {msg.engineUsed && (
                        <span className="text-[10px] text-[#34D399] uppercase">
                          ({msg.engineUsed})
                        </span>
                      )}
                    </>
                  )}
                  <span className="text-[10px] text-[#9AA0AB]/60">{msg.timestamp}</span>
                </div>

                {/* Message Bubble Container */}
                <div
                  className={cn(
                    "w-full max-w-full text-sm",
                    msg.sender === "user"
                      ? "max-w-[85%] bg-[#17181B] border border-[#2A2C31] p-3.5 text-[#F5F6F8]"
                      : "bg-[#0F1012]"
                  )}
                >
                  {/* Tool Trace Accordion if present */}
                  {msg.classification && msg.toolCalls && (
                    <ToolExecutionTrace
                      classification={msg.classification}
                      toolCalls={msg.toolCalls}
                    />
                  )}

                  {/* Text content with Markdown, Tables & Proof Links */}
                  {msg.text && (
                    <div className="prose prose-invert max-w-none text-sm text-[#F5F6F8] leading-relaxed bg-[#17181B] border border-[#2A2C31] p-4 rounded-none space-y-2">
                      <div
                        className="font-sans text-xs sm:text-sm text-[#F5F6F8]/90"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdownContent(msg.text),
                        }}
                      />
                    </div>
                  )}

                  {/* Structured Specialized Views */}
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

            {/* Thinking / Streaming Indicator */}
            {isLoading && (
              <div className="flex flex-col gap-1.5 items-start">
                <div className="flex items-center gap-2 px-1 text-[11px] font-mono text-[#9AA0AB]">
                  <div className="w-4 h-4 rounded-full bg-[#3B82F6] flex items-center justify-center animate-spin">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="font-semibold text-[#F5F6F8]">SolTrace</span>
                  <span>scanning on-chain transactions...</span>
                </div>
                <div className="bg-[#17181B] border border-[#2A2C31] p-4 rounded-none w-full max-w-[420px]">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[#3B82F6] animate-ping" />
                    <span className="text-xs text-[#9AA0AB] font-mono">
                      Querying live Solana cluster & Groq 120B...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Sticky Bottom Input Dock */}
      <footer className="sticky bottom-0 z-30 w-full bg-[#0F1012]/95 backdrop-blur-md border-t border-[#2A2C31] p-4">
        <div className="max-w-[672px] mx-auto flex flex-col gap-2">
          {/* Active Context Helper */}
          {activeWallet && (
            <div className="flex items-center justify-between text-[11px] text-[#9AA0AB] px-1 font-mono">
              <span className="truncate">
                Active context: <span className="text-[#3B82F6] font-semibold">{shortenAddress(activeWallet, 6)}</span>
              </span>
              <span className="text-[10px] text-[#9AA0AB]/80">Paste another address to switch context</span>
            </div>
          )}

          {/* Universal Chat Message Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center bg-[#17181B] border border-[#2A2C31] rounded-none focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6] transition-all"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              placeholder={
                activeWallet
                  ? `Ask anything about ${shortenAddress(activeWallet, 4)} or paste another address...`
                  : "Type any question, or paste a Solana wallet address / transaction..."
              }
              className="w-full bg-transparent py-3 px-3.5 text-sm text-[#F5F6F8] placeholder-[#9AA0AB]/60 rounded-none focus:outline-none disabled:opacity-50"
            />

            <div className="pr-2 flex items-center">
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="rounded-full bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-30 disabled:hover:bg-[#3B82F6] text-white p-2 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm shrink-0"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default ChatInterface;
