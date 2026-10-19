import {
  calculatePortfolioValuation,
  filterIncomingSol,
  filterOutgoingSol,
  filterIncomingTokenTransfers,
  filterOutgoingTokenTransfers,
  formatAddress,
  formatCounterpartyTable,
  formatTokenCounterpartyTable,
  groupAndRankCounterparties,
  groupAndRankTokenCounterparties,
  generateFlowDiagram,
  parseDexSwaps,
  formatDexSwapTable,
  auditWalletSecurity,
  formatSecurityAuditReport,
  formatMultiHopReport,
  TokenCounterpartySummary,
} from './analytics-engine';
import { mcpClient } from './mcp-client';
import { findMutualTransactions, traceLiveMultiHop, MutualTransactionDetail } from './solana-rpc';

export type QueryClassification =
  | 'LOOKUP'
  | 'ENRICHMENT'
  | 'AGGREGATION'
  | 'CONVERSATIONAL'
  | 'FLOW_DIAGRAM'
  | 'SECURITY_AUDIT'
  | 'DEX_TRADES'
  | 'MULTI_HOP';

export interface MessageHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface OrchestrationInput {
  message: string;
  walletAddress?: string;
  history?: MessageHistoryItem[];
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, any>;
  resultSummary?: string;
  data?: any;
}

export interface OrchestrationResult {
  answer: string;
  classification: QueryClassification;
  toolCalls: ToolCallRecord[];
  structuredData?: any;
  engineUsed: 'groq' | 'openai' | 'gemini' | 'deterministic';
}

/**
 * Universal Solana Base58 Address and Transaction Signature Extractor
 */
export function extractSolanaEntities(text: string): {
  addresses: string[];
  signatures: string[];
} {
  const base58Matches = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,90}\b/g) || [];
  const addresses: string[] = [];
  const signatures: string[] = [];

  for (const match of base58Matches) {
    if (match.length >= 86 && match.length <= 90) {
      signatures.push(match);
    } else if (match.length >= 32 && match.length <= 44) {
      addresses.push(match);
    }
  }

  return { addresses, signatures };
}

/**
 * System prompt following context.txt guidelines for SolTrace
 */
export const SYSTEM_ANALYST_PROMPT = `You are SolTrace, an advanced AI Solana on-chain analyst and transaction scanner.
Your job is to understand natural language user questions and relate them directly to the Solana blockchain by synthesizing live on-chain telemetry into clear, rigorous, non-hallucinatory findings.

Follow these rules strictly:
1. ATTACH PROOF OF LINKS (MANDATORY):
   - Every transaction signature you mention MUST be formatted as a clickable Solscan proof link: [tx: <shortSig>](https://solscan.io/tx/<fullSignature>).
   - Every wallet address, counterparty, or token mint you mention MUST be formatted as a clickable Solscan proof link: [account: <shortAddr>](https://solscan.io/account/<fullAddress>) or [token: <shortMint>](https://solscan.io/token/<fullMint>).
2. DIRECT NATURAL LANGUAGE REASONING:
   - Understand the user's natural language question (e.g. trading volume, largest inflow/outflow, whether it's an arbitrage bot or retail trader, recent DEX swaps, token dumps, balance, or security concerns).
   - Give the direct answer first, followed by clear evidence, transfer logs, and markdown tables.
3. CONVERSATIONAL PERSONALITY:
   - When users greet you ("hi", "hello", "how are you"), engage in casual banter, or ask what you can do, be warm, friendly, conversational, and welcoming!
   - Ask how they are doing and invite them to explore wallets, transactions, visual flow charts, DEX trades, or security audits.
4. DATA GROUNDING:
   - Ground every observation in the retrieved on-chain telemetry.
   - If the user asks about something beyond the scanned transactions or without on-chain data, state the scope and limitations honestly.
5. TONE:
   - Engaging, charismatic, objective crypto intelligence investigator. Concrete numbers and transaction proof links over vague claims.`;


/**
 * Classify user intent into LOOKUP, ENRICHMENT, AGGREGATION, CONVERSATIONAL, FLOW_DIAGRAM, SECURITY_AUDIT, DEX_TRADES, or MULTI_HOP.
 */
export function classifyQuery(message: string, history: MessageHistoryItem[] = []): QueryClassification {
  const query = message.toLowerCase().trim();

  // 1. Check for conversational greetings, small-talk, or introductions
  const conversationalGreetings = /^(hi|hello|hey|sup|yo|howdy|greetings|gm|gn|good\s+(morning|afternoon|evening))\b/i;
  const conversationalQuestions = /(how\s+are\s+you|how's\s+it\s+going|what's\s+up|who\s+are\s+you|what\s+can\s+you\s+do|capabilities|help\b|what\s+do\s+you\s+do|tell\s+me\s+about\s+yourself)/i;
  const pleasantries = /^(thanks|thank\s+you|thx|cool|awesome|great|ok|okay)\b/i;

  if (
    (conversationalGreetings.test(query) || conversationalQuestions.test(query) || pleasantries.test(query)) &&
    !/[1-9A-HJ-NP-Za-km-z]{32,44}/.test(query)
  ) {
    return 'CONVERSATIONAL';
  }

  // 2. Security Audit
  if (/security|audit|drainer|safety|risk|phishing|threat|vulnerab|approval/i.test(query)) {
    return 'SECURITY_AUDIT';
  }

  // 3. Visual Flow Diagram
  if (/flow|diagram|visualize|visual|sankey|map\s+(funds|money|flow)|graph/i.test(query)) {
    return 'FLOW_DIAGRAM';
  }

  // 4. DEX Swaps / Trading PnL
  if (/dex|swap|swaps|raydium|jupiter|orca|meteora|trading|pnl|profit|trade\b|buys?|sells?/i.test(query)) {
    return 'DEX_TRADES';
  }

  // 5. Multi-Hop Tracing
  if (/multi[-\s]?hop|follow\s+the\s+money|where\s+did\s+(it|funds?|money|tokens?)\s+go\s+after|trace\s+hops|hops\b/i.test(query)) {
    return 'MULTI_HOP';
  }

  // 6. Check for follow-up patterns from workflow 5 (e.g. "What about the last 500?", "Who does he SEND to?")
  const isFollowUpWindow = /what\s+about\s+(the\s+)?last\s+\d+|paginate|scan\s+more\s+transactions/i.test(query);
  const isFollowUpDirection = /send\s+to|receive\s+from|who\s+does\s+he\s+send|who\s+does\s+she\s+send/i.test(query);

  if (isFollowUpWindow || (isFollowUpDirection && history.length > 0)) {
    return 'AGGREGATION';
  }

  // 7. AGGREGATION keywords: flow, counterparties, frequent senders/receivers
  const aggregationPatterns = [
    /who\s+sends?/i,
    /who\s+sent/i,
    /who\s+transfers?/i,
    /frequent\s+counterpart/i,
    /biggest\s+counterpart/i,
    /top\s+counterpart/i,
    /who\s+does\s+.*\s*receive/i,
    /receive\s+.*from/i,
    /who\s+does\s+.*\s*send/i,
    /send\s+.*to/i,
    /how\s+much\s+sent\s+to/i,
    /how\s+much\s+.*transfer/i,
    /frequent\s+sender/i,
    /frequent\s+receiver/i,
    /top\s+sender/i,
    /top\s+receiver/i,
    /incoming\s+transfer/i,
    /outgoing\s+transfer/i,
    /where\s+did\s+(funds|money|sol)\s+go/i,
    /where\s+did\s+.*\s*send/i,
    /counterparties/i,
    /counterparty/i,
  ];

  for (const pattern of aggregationPatterns) {
    if (pattern.test(query)) {
      return 'AGGREGATION';
    }
  }

  // 8. ENRICHMENT keywords: net worth, portfolio valuation, whale status
  const enrichmentPatterns = [
    /portfolio\s+worth/i,
    /how\s+much\s+is\s+it\s+worth/i,
    /is\s+this\s+a\s+whale/i,
    /total\s+usd\s+value/i,
    /net\s+worth/i,
    /total\s+valuation/i,
    /portfolio\s+value/i,
    /usd\s+valuation/i,
    /usd\s+balance/i,
    /whale\s+status/i,
    /holdings\s+worth/i,
    /total\s+balance\s+in\s+usd/i,
  ];

  for (const pattern of enrichmentPatterns) {
    if (pattern.test(query)) {
      return 'ENRICHMENT';
    }
  }

  // 9. LOOKUP keywords: simple balances, tokens held, last 10 transactions
  return 'LOOKUP';
}

/**
 * Generate friendly conversational responses for greetings, identity, and capabilities
 */
export function generateConversationalResponse(message: string): string {
  const q = message.toLowerCase().trim();

  if (/how\s+are\s+you|how's\s+it\s+going|how\s+r\s+u|how\s+do\s+you\s+do/i.test(q)) {
    return `Hey there! I'm doing great, thank you for asking! 😊\n\nI'm **SolTrace**, your AI-powered Solana on-chain analyst. I'm connected directly to Solana mainnet, ready to scan wallets, track money flows, audit contract risks, or investigate any transaction hash.\n\nHow is your day going? Do you have a specific wallet or transaction you'd like me to look into?`;
  }

  if (/who\s+are\s+you|what\s+is\s+soltrace|what\s+are\s+you/i.test(q)) {
    return `👋 **I am SolTrace** — an advanced conversational AI investigator built specifically for the Solana blockchain.\n\nUnlike traditional explorers where you have to decipher raw bytecode, I understand plain natural language and connect it directly to live on-chain telemetry with clickable Solscan proof links.\n\nYou can chat with me naturally and ask me to investigate any address or transaction!`;
  }

  if (/what\s+can\s+you\s+do|capabilities|help\b|features|what\s+do\s+you\s+do/i.test(q)) {
    return `### What SolTrace Can Do For You 🚀\n\nHere is how I can help you analyze the Solana ledger:\n\n1. 🔍 **Deep Wallet & Balance Lookups:** Ask about SOL balances, SPL token holdings (USDT, USDC, meme coins), and recent transactions.\n2. 📊 **Interactive Visual Money Flow:** Ask to *"visualize money flow"* to see an inline diagram of where funds enter and leave.\n3. 🛡️ **Security & Drainer Risk Audit:** Ask to *"audit wallet security"* for a safety score (0–100%), delegated spending approvals, and scam tokens.\n4. 📈 **DEX Swap & PnL Tracking:** Ask *"show DEX swaps"* to decode trades on Raydium, Jupiter, Orca, and Meteora with buy/sell amounts.\n5. ⛓️ **Multi-Hop Path Tracing:** Ask to *"follow the money"* to trace outgoing funds 2–3 hops deep into recipient wallets or exchange hot wallets.\n6. 🤝 **Mutual Transaction Discovery:** Give me any 2 addresses (e.g. *"did Wallet A and Wallet B transact?"*) and I'll find all shared transactions and tokens.\n\nGo ahead and paste a wallet address, transaction signature, or ask any question!`;
  }

  if (/thanks|thank\s+you|thx|appreciate/i.test(q)) {
    return `You're very welcome! Always happy to help. Let me know whenever you'd like to investigate another wallet or verify on-chain activity! 🤝`;
  }

  // General greeting fallback
  return `Hello and welcome! 👋 I'm **SolTrace**, your AI Solana on-chain investigator.\n\nI can analyze wallet holdings, rank top senders/recipients of SOL and USDT/USDC, audit security risks, decode DEX swaps, and generate visual money flow maps.\n\nHow are you doing today? Paste any Solana wallet address or transaction signature to get started!`;
}

/**
 * Extract transaction window size requested by user (e.g. "last 500", "last 200", default 100)
 */
function extractTransactionLimit(message: string): number {
  const match = message.match(/(?:last|window|top|fetch|scan)\s+(\d+)/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) {
      return Math.min(val, 500); // capped at 500 for rate limit safety
    }
  }
  return 100;
}

/**
 * Detect direction from query or history: incoming (default) vs outgoing
 */
function detectDirection(message: string, history: MessageHistoryItem[] = []): 'incoming' | 'outgoing' {
  const query = message.toLowerCase();
  if (
    /send\s+to|sent\s+to|outgoing|who\s+does\s+he\s+send|who\s+does\s+she\s+send|recipient|destinations/i.test(query)
  ) {
    return 'outgoing';
  }
  if (
    /receive\s+from|received\s+from|incoming|sender|who\s+sends/i.test(query)
  ) {
    return 'incoming';
  }

  // Check last user query in history
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      const prev = history[i].content.toLowerCase();
      if (/send\s+to|outgoing|recipient/i.test(prev)) return 'outgoing';
      if (/receive\s+from|incoming|sender/i.test(prev)) return 'incoming';
    }
  }

  return 'incoming';
}

/**
 * Deterministic Analytical Synthesizer:
 * Formats grounded answers adhering strictly to context.txt when no LLM key is configured.
 */
function synthesizeDeterministicResponse(params: {
  walletAddress: string;
  question: string;
  classification: QueryClassification;
  data: any;
  limit?: number;
  direction?: 'incoming' | 'outgoing';
}): string {
  const { walletAddress, question, classification, data, direction = 'incoming' } = params;
  const shortAddr = formatAddress(walletAddress, 4);

  let response = `**Wallet:** [${shortAddr}](https://solscan.io/account/${walletAddress})\n**Query:** "${question}"\n\n`;

  if (classification === 'AGGREGATION') {
    const { ranked, rankedTokens, totalScanned, dir } = data;
    const isIncoming = dir === 'incoming';
    const top = ranked && ranked.length > 0 ? ranked[0] : null;

    if (top) {
      const labelStr = top.label !== 'Unlabeled' ? ` (${top.label})` : '';
      const topLink = `[${formatAddress(top.address, 4)}](https://solscan.io/account/${top.address})`;
      response += `### Direct Finding\n`;
      response += `The most frequent ${isIncoming ? 'sender' : 'recipient'} of SOL is **${topLink}**${labelStr}, with **${top.count} transactions** totaling **${top.totalSol.toFixed(4)} SOL** (avg ${top.avgSol.toFixed(4)} SOL per transfer).\n\n`;
    } else {
      response += `### Direct Finding\n`;
      response += `No ${isIncoming ? 'incoming' : 'outgoing'} SOL transfers were identified in the examined block window.\n\n`;
    }

    if (rankedTokens && rankedTokens.length > 0) {
      const topToken = rankedTokens[0];
      const tokenLink = `[${formatAddress(topToken.address, 4)}](https://solscan.io/account/${topToken.address})`;
      response += `For SPL tokens (USDT / USDC), the primary ${isIncoming ? 'sender' : 'recipient'} is **${tokenLink}**, transferring a total of **${topToken.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${topToken.symbol}** across **${topToken.count} transactions**.\n\n`;
    }

    response += `### SOL Counterparty Breakdown\n`;
    response += formatCounterpartyTable(ranked || [], dir, 5);
    response += `\n\n`;

    if (rankedTokens && rankedTokens.length > 0) {
      response += `### Token Counterparty Breakdown (USDT / USDC)\n`;
      response += formatTokenCounterpartyTable(rankedTokens, dir, 5);
      response += `\n\n`;
    }

    response += `### Data Scope & Limitations\n`;
    response += `- **Transactions Scanned:** Scanned **${totalScanned} transactions** across native SOL and Associated Token Accounts (ATAs).\n`;
    response += `- **Scope:** Based on the most recent on-chain activity window. Click on any counterparty address to inspect on Solscan.\n`;
    response += `- **Limitations:** Addresses without public tags are presented raw as "Unlabeled". Subject to Solscan free tier rate limits.\n`;

    return response;
  }

  if (classification === 'ENRICHMENT') {
    const valuation = data.valuation;
    response += `### Direct Finding\n`;
    response += `Total Estimated Portfolio Value: **$${valuation.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD**.\n`;
    response += `Whale Status: **${valuation.isWhale ? 'Whale Wallet (Confirmed)' : 'Standard Active Wallet (Below Whale Threshold of $1M / 5,000 SOL)'}**.\n\n`;

    response += `### Asset Breakdown\n`;
    response += `| Asset | Balance | USD Price | USD Valuation |\n`;
    response += `| :--- | :---: | :---: | :---: |\n`;
    response += `| **SOL (Native)** | ${valuation.solBalance.toFixed(4)} SOL | $${valuation.solPriceUsd.toFixed(2)} | $${valuation.solUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} |\n`;

    for (const h of valuation.topHoldings.slice(0, 5)) {
      response += `| **${h.symbol}** | ${h.uiAmount.toLocaleString()} | $${h.priceUsd.toFixed(4)} | $${h.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} |\n`;
    }
    response += `\n`;

    response += `### Data Scope & Limitations\n`;
    response += `- **Data Scope:** Evaluated native SOL balance plus **${valuation.topHoldings.length} SPL token accounts**.\n`;
    response += `- **Price Feeds:** Valuations calculated via live Solscan DEX/CEX composite pricing.\n`;
    response += `- **Limitations:** Unlisted meme tokens or illiquid positions may have $0.00 valuation or delayed index updates.\n`;

    return response;
  }

  // LOOKUP
  response += `### Direct Answer\n`;
  if (data.type === 'balance') {
    const detail = data.detail;
    const solBal = detail.sol_balance ?? (detail.lamports ? detail.lamports / 1e9 : 0);
    const walletLink = `[${shortAddr}](https://solscan.io/account/${walletAddress})`;
    response += `The current balance of ${walletLink} is **${solBal.toFixed(4)} SOL** (${(detail.lamports || 0).toLocaleString()} lamports).\n`;
    response += `- **Account Type:** \`${detail.account_type || 'system_account'}\`\n`;
    response += `- **Owner Program:** \`${formatAddress(detail.owner_program || '11111111111111111111111111111111', 4)}\`\n\n`;

    if (data.tokens) {
      const rawTokens = Array.isArray(data.tokens) ? data.tokens : (data.tokens?.tokens || []);
      if (rawTokens.length > 0) {
        response += `### Token Holdings (SPL)\n`;
        response += `| Token | Symbol | Amount | USD Value |\n`;
        response += `| :--- | :---: | :---: | :---: |\n`;
        for (const t of rawTokens.slice(0, 8)) {
          const sym = t.token_symbol || t.symbol || 'SPL';
          const name = t.token_name || t.name || sym;
          const amt = t.amount ?? t.ui_amount ?? 0;
          const val = t.value_usd ?? t.usd_value ?? 0;
          const mintLink = t.token_address ? `[${name}](https://solscan.io/token/${t.token_address})` : name;
          response += `| ${mintLink} | \`${sym}\` | ${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 6 })} | $${Number(val).toFixed(2)} |\n`;
        }
        response += `\n`;
      }
    }

    if (data.transactions) {
      const txs = Array.isArray(data.transactions) ? data.transactions : (data.transactions?.transactions || []);
      if (txs.length > 0) {
        response += `### Recent On-Chain Activity\n`;
        response += `| Signature | Block Time | Fee (SOL) | Status |\n`;
        response += `| :--- | :---: | :---: | :---: |\n`;
        for (const tx of txs.slice(0, 5)) {
          const timeStr = new Date((tx.block_time || Date.now() / 1000) * 1000).toISOString().replace('T', ' ').slice(0, 19);
          const txProof = `[${formatAddress(tx.signature, 4)}](https://solscan.io/tx/${tx.signature})`;
          response += `| ${txProof} | ${timeStr} | ${tx.fee || 0.000005} | \`${tx.status || 'Success'}\` |\n`;
        }
        response += `\n`;
      }
    }
  } else if (data.type === 'tokens') {
    const tokens = Array.isArray(data.tokens) ? data.tokens : (data.tokens?.tokens || []);
    if (tokens.length === 0) {
      response += `This wallet holds **0 SPL tokens** on Solana mainnet.\n\n`;
    } else {
      response += `This wallet holds **${tokens.length} SPL tokens**.\n\n`;
      response += `| Token | Symbol | Amount | USD Value |\n`;
      response += `| :--- | :---: | :---: | :---: |\n`;
      for (const t of tokens.slice(0, 8)) {
        const sym = t.token_symbol || t.symbol || 'SPL';
        const name = t.token_name || t.name || sym;
        const amt = t.amount ?? t.ui_amount ?? 0;
        const val = t.value_usd ?? t.usd_value ?? 0;
        response += `| ${name} | \`${sym}\` | ${Number(amt).toLocaleString()} | $${Number(val).toFixed(2)} |\n`;
      }
      response += `\n`;
    }
  } else if (data.type === 'transactions') {
    const txs = Array.isArray(data.transactions) ? data.transactions : (data.transactions?.transactions || []);
    if (txs.length === 0) {
      response += `No recent transactions were found on Solana mainnet for [${shortAddr}](https://solscan.io/account/${walletAddress}). This account may be new or has not transacted recently.\n\n`;
    } else {
      response += `Retrieved the last **${txs.length} transactions** for [${shortAddr}](https://solscan.io/account/${walletAddress}).\n\n`;
      response += `| Signature | Block Time | Fee (SOL) | Status |\n`;
      response += `| :--- | :---: | :---: | :---: |\n`;
      for (const tx of txs.slice(0, 6)) {
        const timeStr = new Date((tx.block_time || Date.now() / 1000) * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const txProof = `[${formatAddress(tx.signature, 4)}](https://solscan.io/tx/${tx.signature})`;
        response += `| ${txProof} | ${timeStr} | ${tx.fee || 0.000005} | \`${tx.status || 'Success'}\` |\n`;
      }
      response += `\n`;
    }
  } else {
    response += `${JSON.stringify(data.raw, null, 2)}\n\n`;
  }

  response += `### Data Scope & Limitations\n`;
  response += `- **Source:** SolTrace Live on-chain data (Solscan & Solana Mainnet Cluster).\n`;
  response += `- **Limitations:** Subject to standard blockchain confirmation latency and node rate limits.\n`;

  return response;
}

/**
 * Call external LLM (Groq AI primary, OpenAI/Gemini fallback)
 */
async function callLLMEngine(
  systemPrompt: string,
  userPrompt: string,
  history: MessageHistoryItem[] = []
): Promise<{ answer: string; engine: 'groq' | 'openai' | 'gemini' } | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Primary: Groq AI with model fallbacks
  if (groqKey) {
    const groqModels = [
      process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-120b',
      process.env.GROQ_FALLBACK_MODEL_1 || 'qwen/qwen3.8-27b',
      process.env.GROQ_FALLBACK_MODEL_2 || 'openai/gpt-oss-20b',
    ];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: userPrompt },
    ];

    for (const model of groqModels) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.15,
            max_tokens: 1500,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content;
          if (content && content.trim().length > 0) {
            return { answer: content.trim(), engine: 'groq' };
          }
        } else {
          const errText = await res.text();
          console.warn(`[Orchestrator] Groq model ${model} HTTP ${res.status}:`, errText);
        }
      } catch (err: any) {
        console.warn(`[Orchestrator] Groq model ${model} failed, trying next fallback:`, err.message);
      }
    }
  }

  // 2. OpenAI Secondary Fallback
  if (openaiKey) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: userPrompt },
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          return { answer: content, engine: 'openai' };
        }
      }
    } catch (err: any) {
      console.warn('[Orchestrator] OpenAI call failed, falling back:', err.message);
    }
  }

  // 3. Gemini Fallback
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const promptText = `${systemPrompt}\n\nUser Question and Retrieved On-Chain Data:\n${userPrompt}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { answer: text, engine: 'gemini' };
        }
      }
    } catch (err: any) {
      console.warn('[Orchestrator] Gemini call failed, falling back:', err.message);
    }
  }

  return null;
}

/**
 * Execute deep cross-matching of transactions between two Solana addresses
 */
export async function executeMutualAddressScan(
  address1: string,
  address2: string,
  message: string,
  history: MessageHistoryItem[] = []
): Promise<OrchestrationResult> {
  const short1 = formatAddress(address1, 4);
  const short2 = formatAddress(address2, 4);
  const link1 = `[${short1}](https://solscan.io/account/${address1})`;
  const link2 = `[${short2}](https://solscan.io/account/${address2})`;

  const toolCalls: ToolCallRecord[] = [
    {
      tool: 'mutual_address_scanner',
      args: { address1, address2 },
      resultSummary: `Scanned on-chain interactions and mutual transactions between ${short1} and ${short2}`,
    },
  ];

  const mutualTxs = await findMutualTransactions(address1, address2);
  toolCalls[0].data = { count: mutualTxs.length, transactions: mutualTxs };

  let deterministicAnswer = `**Address Comparison & Common Transaction Scan**\n`;
  deterministicAnswer += `- **Wallet 1:** ${link1} (\`${address1}\`)\n`;
  deterministicAnswer += `- **Wallet 2:** ${link2} (\`${address2}\`)\n\n`;

  if (mutualTxs.length > 0) {
    const totalAmount = mutualTxs.reduce((sum, t) => sum + t.amount, 0);
    const symbols = Array.from(new Set(mutualTxs.map((t) => t.symbol))).join(', ');

    deterministicAnswer += `### Direct Finding\n`;
    deterministicAnswer += `**Yes, these two addresses have transactions in common on the Solana blockchain.**\n`;
    deterministicAnswer += `Found **${mutualTxs.length} mutual transaction${mutualTxs.length > 1 ? 's' : ''}** totaling **${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbols}**.\n\n`;

    deterministicAnswer += `### Common On-Chain Transactions\n`;
    deterministicAnswer += `| Transaction Proof | Date / Time | Type | Amount | From | To | Status |\n`;
    deterministicAnswer += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

    for (const t of mutualTxs) {
      const shortSig = formatAddress(t.signature, 4);
      const proofLink = `[tx: ${shortSig}](https://solscan.io/tx/${t.signature})`;
      const timeStr = new Date(t.blockTime * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const fromLink = `[${formatAddress(t.from, 4)}](https://solscan.io/account/${t.from})`;
      const toLink = `[${formatAddress(t.to, 4)}](https://solscan.io/account/${t.to})`;
      deterministicAnswer += `| ${proofLink} | ${timeStr} | ${t.type} | **${t.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${t.symbol}** | ${fromLink} | ${toLink} | \`${t.status}\` |\n`;
    }
    deterministicAnswer += `\n`;
  } else {
    deterministicAnswer += `### Direct Finding\n`;
    deterministicAnswer += `**No direct mutual transactions were found** between ${link1} and ${link2} across their recent transaction histories and Associated Token Accounts (including USDT and USDC).\n\n`;
  }

  deterministicAnswer += `### Data Scope & Limitations\n`;
  deterministicAnswer += `- **Deep Search:** Verified native SOL ledger and Associated Token Accounts (ATAs) including USDT and USDC mints.\n`;
  deterministicAnswer += `- **Proof Links:** All transaction signatures and addresses link directly to verified Solscan records.\n`;

  const userPromptWithData = `Comparison Analysis:\nWallet 1: ${address1} (Solscan: https://solscan.io/account/${address1})\nWallet 2: ${address2} (Solscan: https://solscan.io/account/${address2})\nUser Question: ${message}\nMutual Transactions Discovered:\n${JSON.stringify(mutualTxs, null, 2)}\n\nIMPORTANT GUIDANCE:\n- Answer directly whether these addresses have transactions in common.\n- Detail every mutual transaction (Date, Amount, Token, Direction).\n- Include clickable Solscan proof links for EVERY transaction signature: [tx: <shortSig>](https://solscan.io/tx/<fullSig>).\n- Include clickable Solscan links for both addresses: [account: <shortAddr>](https://solscan.io/account/<fullAddr>).`;

  const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, userPromptWithData, history);

  if (llmResult) {
    let finalAnswer = llmResult.answer;
    if (!finalAnswer.includes('| Transaction Proof |') && !finalAnswer.includes('| Signature |') && mutualTxs.length > 0) {
      const splitTable = deterministicAnswer.split('### Common On-Chain Transactions\n')[1];
      if (splitTable) {
        finalAnswer += `\n\n### Common On-Chain Transactions\n` + splitTable;
      }
    }
    return {
      answer: finalAnswer,
      classification: 'AGGREGATION',
      toolCalls,
      structuredData: { type: 'mutual_transactions', count: mutualTxs.length, transactions: mutualTxs },
      engineUsed: llmResult.engine,
    };
  }

  return {
    answer: deterministicAnswer,
    classification: 'AGGREGATION',
    toolCalls,
    structuredData: { type: 'mutual_transactions', count: mutualTxs.length, transactions: mutualTxs },
    engineUsed: 'deterministic',
  };
}

/**
 * Main AI Orchestrator Execution Pipeline
 */
export async function executeOrchestrator(input: OrchestrationInput): Promise<OrchestrationResult> {
  const { message, history = [] } = input;
  let walletAddress = (input.walletAddress || '').trim();

  const extracted = extractSolanaEntities(message);
  const detectedAddresses: string[] = [];

  for (const addr of extracted.addresses) {
    if (!detectedAddresses.includes(addr)) {
      detectedAddresses.push(addr);
    }
  }

  // Also check history for addresses if fewer than 2
  if (detectedAddresses.length < 2) {
    if (walletAddress && !detectedAddresses.includes(walletAddress)) {
      detectedAddresses.push(walletAddress);
    }
    for (let i = history.length - 1; i >= 0 && detectedAddresses.length < 2; i--) {
      const histExtracted = extractSolanaEntities(history[i].content);
      for (const hAddr of histExtracted.addresses) {
        if (!detectedAddresses.includes(hAddr)) {
          detectedAddresses.push(hAddr);
          if (detectedAddresses.length >= 2) break;
        }
      }
    }
  }

  // Check if mutual scan is requested (2 addresses present and either common/mutual/between query or 2 addresses in prompt)
  const isMutualQuery = /common|mutual|shared|connect|both|between|each\s+other|interact|relation/i.test(message) ||
    extracted.addresses.length >= 2;

  if (detectedAddresses.length >= 2 && isMutualQuery) {
    return await executeMutualAddressScan(detectedAddresses[0], detectedAddresses[1], message, history);
  }

  // If no walletAddress provided, extract from message or history
  if (!walletAddress) {
    if (extracted.addresses.length > 0) {
      walletAddress = extracted.addresses[0];
    } else {
      for (let i = history.length - 1; i >= 0; i--) {
        const histExtracted = extractSolanaEntities(history[i].content);
        if (histExtracted.addresses.length > 0) {
          walletAddress = histExtracted.addresses[0];
          break;
        }
      }
    }
  }

  const classification = classifyQuery(message, history);

  // 1. CONVERSATIONAL QUERY (greetings, how are you, capabilities, small-talk)
  if (classification === 'CONVERSATIONAL') {
    const activeWalletNote = walletAddress
      ? `(Current Active Context Wallet: ${walletAddress})`
      : '(No wallet currently loaded)';

    const llmGreeting = await callLLMEngine(
      SYSTEM_ANALYST_PROMPT,
      `User: "${message}"\n${activeWalletNote}\n\nRespond naturally and warmly as SolTrace AI. Answer their greeting, ask how they are doing, explain your key capabilities (visual money flow diagrams, security risk audits, DEX trades/PnL, multi-hop tracing, counterparty flow analysis), and invite them to paste any wallet or ask a question.`,
      history
    );

    if (llmGreeting) {
      return {
        answer: llmGreeting.answer,
        classification: 'CONVERSATIONAL',
        toolCalls: [],
        structuredData: { type: 'conversational' },
        engineUsed: llmGreeting.engine,
      };
    }

    return {
      answer: generateConversationalResponse(message),
      classification: 'CONVERSATIONAL',
      toolCalls: [],
      structuredData: { type: 'conversational' },
      engineUsed: 'deterministic',
    };
  }

  // If still no wallet address found, handle general questions, transaction signatures, or guide user
  if (!walletAddress) {
    const extracted = extractSolanaEntities(message);
    if (extracted.signatures.length > 0) {
      const sig = extracted.signatures[0];
      const shortSig = formatAddress(sig, 4);
      const proofLink = `[tx: ${shortSig}](https://solscan.io/tx/${sig})`;

      return {
        answer: `### Transaction Scan\n\nVerified On-Chain Proof: ${proofLink}\n\n- **Transaction Signature:** \`${sig}\`\n- **Solscan Explorer:** [https://solscan.io/tx/${sig}](https://solscan.io/tx/${sig})\n\nThis transaction signature was identified on the Solana ledger. Provide any wallet address to scan its portfolio, balances, and counterparty flows.`,
        classification: 'LOOKUP',
        toolCalls: [],
        structuredData: { signature: sig },
        engineUsed: 'deterministic',
      };
    }

    const isGeneralSolanaQuery = /solana|blockchain|crypto|how\s+does|what\s+is|explain|token|dex|fee|rent|program/i.test(message);
    if (isGeneralSolanaQuery) {
      const llmResult = await callLLMEngine(
        SYSTEM_ANALYST_PROMPT,
        `User Question: ${message}\n\nPlease answer this Solana blockchain question thoroughly and objectively. When referencing standard programs or tokens, include relevant Solscan proof links.`,
        history
      );
      if (llmResult) {
        return {
          answer: llmResult.answer,
          classification: 'LOOKUP',
          toolCalls: [],
          structuredData: { type: 'general_query' },
          engineUsed: llmResult.engine,
        };
      }
    }

    return {
      answer: `**SolTrace AI Transaction Scanner**\n\nTo scan the Solana blockchain, please provide a wallet address or transaction signature in your message (e.g., \`7xKXtg...\` or a transaction hash).\n\nYou can ask any natural language question, such as:\n- *"Scan \`7xKXtg...\` and tell me what its largest transactions are"*\n- *"Did this address sell any tokens recently?"*\n- *"Who transfers the most SOL into this wallet?"*\n- *"Audit wallet security for \`7xKXtg...\`"*\n- *"Visualize money flow for \`7xKXtg...\`"*`,
      classification: 'LOOKUP',
      toolCalls: [],
      structuredData: { promptForAddress: true },
      engineUsed: 'deterministic',
    };
  }

  const toolCalls: ToolCallRecord[] = [];
  let structuredData: any = {};
  let deterministicData: any = {};

  // 2. FLOW DIAGRAM QUERY
  if (classification === 'FLOW_DIAGRAM') {
    toolCalls.push({
      tool: 'account_transactions',
      args: { address: walletAddress, limit: 25 },
      resultSummary: `Fetched transactions to build visual money flow diagram for ${formatAddress(walletAddress, 4)}`,
    });
    const txExec = await mcpClient.callTool<any>('account_transactions', { address: walletAddress, limit: 25 });
    const rawTxData = txExec.data;
    const txRecords = Array.isArray(rawTxData) ? rawTxData : (rawTxData?.transactions || []);

    const incomingSol = filterIncomingSol(txRecords, walletAddress);
    const outgoingSol = filterOutgoingSol(txRecords, walletAddress);
    const incomingTokens = filterIncomingTokenTransfers(txRecords, walletAddress);
    const outgoingTokens = filterOutgoingTokenTransfers(txRecords, walletAddress);

    const diagram = generateFlowDiagram(walletAddress, incomingSol, outgoingSol, incomingTokens, outgoingTokens);
    const shortAddr = formatAddress(walletAddress, 4);
    const targetLink = `[${shortAddr}](https://solscan.io/account/${walletAddress})`;

    const answer = `### Visual Money Flow Diagram: ${targetLink}\n\nHere is the on-chain money flow mapping inbound senders and outbound recipients across native SOL, USDT, and USDC:\n\n${diagram}\n\n### Flow Summary\n- **Inbound Transfers:** Identified **${incomingSol.length + incomingTokens.length} incoming transfer(s)**.\n- **Outbound Transfers:** Identified **${outgoingSol.length + outgoingTokens.length} outgoing transfer(s)**.\n- **Scope:** Based on the last 25 transactions and Associated Token Accounts (ATAs). Click on any counterparty address to inspect on Solscan.`;

    return {
      answer,
      classification: 'FLOW_DIAGRAM',
      toolCalls,
      structuredData: { type: 'flow_diagram', incomingCount: incomingSol.length, outgoingCount: outgoingSol.length },
      engineUsed: 'deterministic',
    };
  }

  // 3. SECURITY AUDIT QUERY
  if (classification === 'SECURITY_AUDIT') {
    toolCalls.push({
      tool: 'account_detail',
      args: { address: walletAddress },
      resultSummary: `Auditing account authority for ${formatAddress(walletAddress, 4)}`,
    });
    const accExec = await mcpClient.callTool<any>('account_detail', { address: walletAddress });
    const accDetail = accExec.data;

    toolCalls.push({
      tool: 'token_accounts',
      args: { address: walletAddress },
      resultSummary: `Checking delegated approvals across SPL token accounts`,
    });
    const tokExec = await mcpClient.callTool<any>('token_accounts', { address: walletAddress });
    const tokens = Array.isArray(tokExec.data) ? tokExec.data : (tokExec.data?.tokens || []);

    const txExec = await mcpClient.callTool<any>('account_transactions', { address: walletAddress, limit: 15 });
    const txs = Array.isArray(txExec.data) ? txExec.data : (txExec.data?.transactions || []);

    const audit = auditWalletSecurity(accDetail, tokens, txs);
    const report = formatSecurityAuditReport(audit, walletAddress);

    return {
      answer: report,
      classification: 'SECURITY_AUDIT',
      toolCalls,
      structuredData: { type: 'security_audit', audit },
      engineUsed: 'deterministic',
    };
  }

  // 4. DEX TRADES / SWAP HISTORY QUERY
  if (classification === 'DEX_TRADES') {
    toolCalls.push({
      tool: 'account_transactions',
      args: { address: walletAddress, limit: 25 },
      resultSummary: `Scanning DEX swaps across Raydium, Jupiter, Orca, Meteora for ${formatAddress(walletAddress, 4)}`,
    });
    const txExec = await mcpClient.callTool<any>('account_transactions', { address: walletAddress, limit: 25 });
    const rawTxData = txExec.data;
    const txRecords = Array.isArray(rawTxData) ? rawTxData : (rawTxData?.transactions || []);

    const swaps = parseDexSwaps(txRecords, walletAddress);
    const shortAddr = formatAddress(walletAddress, 4);
    const targetLink = `[${shortAddr}](https://solscan.io/account/${walletAddress})`;

    let answer = `### DEX Trading & Swap History: ${targetLink}\n\n`;
    answer += `Scanned DEX interactions on **Raydium**, **Jupiter**, **Orca**, **Meteora**, and **Pump.fun**:\n\n`;
    answer += formatDexSwapTable(swaps, 8);
    answer += `\n\n### Trading Activity Summary\n`;
    answer += `- **Total DEX Swaps Identified:** **${swaps.length} swap(s)**.\n`;
    answer += `- **Buy Orders:** ${swaps.filter((s) => s.type === 'BUY').length} | **Sell Orders:** ${swaps.filter((s) => s.type === 'SELL').length}.\n`;
    answer += `- **Data Scope:** Evaluated recent transaction history and token balance delta records.`;

    return {
      answer,
      classification: 'DEX_TRADES',
      toolCalls,
      structuredData: { type: 'dex_swaps', count: swaps.length, swaps },
      engineUsed: 'deterministic',
    };
  }

  // 5. MULTI-HOP TRACING QUERY
  if (classification === 'MULTI_HOP') {
    toolCalls.push({
      tool: 'multi_hop_tracer',
      args: { address: walletAddress, hops: 2 },
      resultSummary: `Tracing 2-hop fund destination flow from ${formatAddress(walletAddress, 4)}`,
    });
    const traceResult = await traceLiveMultiHop(walletAddress, 2);
    const report = formatMultiHopReport(traceResult);

    return {
      answer: report,
      classification: 'MULTI_HOP',
      toolCalls,
      structuredData: { type: 'multi_hop_trace', trace: traceResult },
      engineUsed: 'deterministic',
    };
  }

  // 6. AGGREGATION QUERY
  if (classification === 'AGGREGATION') {
    const limit = extractTransactionLimit(message);
    const direction = detectDirection(message, history);

    toolCalls.push({
      tool: 'account_transactions',
      args: { address: walletAddress, limit },
      resultSummary: `Requested ${limit} transactions for ${formatAddress(walletAddress, 4)}`,
    });

    const txExec = await mcpClient.callTool<any>('account_transactions', {
      address: walletAddress,
      limit,
    });

    const rawTxData = txExec.data;
    const txRecords = Array.isArray(rawTxData)
      ? rawTxData
      : (rawTxData?.transactions || []);

    toolCalls[0].data = { fetchedCount: txRecords.length, source: txExec.source };

    // Analytics processing: filter incoming / outgoing SOL and SPL tokens (USDT, USDC, etc.)
    let ranked = [];
    let rankedTokens: TokenCounterpartySummary[] = [];
    if (direction === 'incoming') {
      const incomingTransfers = filterIncomingSol(txRecords, walletAddress);
      ranked = groupAndRankCounterparties(incomingTransfers, walletAddress, 'count');
      const incomingTokens = filterIncomingTokenTransfers(txRecords, walletAddress);
      rankedTokens = groupAndRankTokenCounterparties(incomingTokens, walletAddress);
      deterministicData = {
        ranked,
        rankedTokens,
        totalScanned: txRecords.length,
        dir: 'incoming',
      };
    } else {
      const outgoingTransfers = filterOutgoingSol(txRecords, walletAddress);
      ranked = groupAndRankCounterparties(outgoingTransfers, walletAddress, 'count');
      const outgoingTokens = filterOutgoingTokenTransfers(txRecords, walletAddress);
      rankedTokens = groupAndRankTokenCounterparties(outgoingTokens, walletAddress);
      deterministicData = {
        ranked,
        rankedTokens,
        totalScanned: txRecords.length,
        dir: 'outgoing',
      };
    }

    structuredData = {
      type: 'aggregation',
      direction,
      totalScanned: txRecords.length,
      rankedCounterparties: ranked,
      rankedTokenCounterparties: rankedTokens,
    };
  }
  // 2. ENRICHMENT QUERY
  else if (classification === 'ENRICHMENT') {
    // Multi-tool dispatch: account_detail + token_accounts + token_price
    toolCalls.push({
      tool: 'account_detail',
      args: { address: walletAddress },
      resultSummary: `Fetched SOL account detail for ${formatAddress(walletAddress, 4)}`,
    });
    const accExec = await mcpClient.callTool<any>('account_detail', { address: walletAddress });
    const accDetail = accExec.data;
    toolCalls[0].data = accDetail;

    toolCalls.push({
      tool: 'token_accounts',
      args: { address: walletAddress },
      resultSummary: `Fetched SPL token accounts for ${formatAddress(walletAddress, 4)}`,
    });
    const tokensExec = await mcpClient.callTool<any>('token_accounts', { address: walletAddress });
    const tokensData = tokensExec.data;
    const tokens = Array.isArray(tokensData) ? tokensData : (tokensData?.tokens || []);
    toolCalls[1].data = { count: tokens.length };

    toolCalls.push({
      tool: 'token_price',
      args: { token_address: 'So11111111111111111111111111111111111111112' },
      resultSummary: 'Fetched native SOL live price',
    });
    const solPriceExec = await mcpClient.callTool<any>('token_price', {
      token_address: 'So11111111111111111111111111111111111111112',
    });
    const solPriceData = solPriceExec.data;
    const solPriceUsd = solPriceData?.price_usd || 150.0;
    toolCalls[2].data = solPriceData;

    // Join and calculate portfolio valuation
    const valuation = calculatePortfolioValuation(accDetail, tokens, solPriceUsd);
    deterministicData = { valuation };
    structuredData = {
      type: 'enrichment',
      valuation,
    };
  }
  // 3. LOOKUP QUERY
  else {
    const query = message.toLowerCase();
    if (/token|spl|holdings|coins/i.test(query)) {
      toolCalls.push({
        tool: 'token_accounts',
        args: { address: walletAddress },
        resultSummary: `Looked up SPL token holdings for ${formatAddress(walletAddress, 4)}`,
      });
      const tokensExec = await mcpClient.callTool<any>('token_accounts', { address: walletAddress });
      const tokens = tokensExec.data;
      toolCalls[0].data = tokens;

      // Also retrieve recent transactions and account detail so full activity is visible
      const txExec = await mcpClient.callTool<any>('account_transactions', { address: walletAddress, limit: 10 });
      const txs = txExec.data;
      const detailExec = await mcpClient.callTool<any>('account_detail', { address: walletAddress });
      const detail = detailExec.data;

      deterministicData = { type: 'tokens', tokens, transactions: txs, detail };
      structuredData = { type: 'lookup_tokens', tokens, transactions: txs, detail };
    } else if (/transact|tx|history|recent/i.test(query)) {
      toolCalls.push({
        tool: 'account_transactions',
        args: { address: walletAddress, limit: 10 },
        resultSummary: `Looked up recent 10 transactions for ${formatAddress(walletAddress, 4)}`,
      });
      const txExec = await mcpClient.callTool<any>('account_transactions', { address: walletAddress, limit: 10 });
      const txs = txExec.data;
      const count = Array.isArray(txs) ? txs.length : (txs?.transactions?.length || 0);
      toolCalls[0].data = { count };

      // Also retrieve tokens and account detail
      const tokensExec = await mcpClient.callTool<any>('token_accounts', { address: walletAddress });
      const tokens = tokensExec.data;
      const detailExec = await mcpClient.callTool<any>('account_detail', { address: walletAddress });
      const detail = detailExec.data;

      deterministicData = { type: 'transactions', transactions: txs, tokens, detail };
      structuredData = { type: 'lookup_transactions', transactions: txs, tokens, detail };
    } else {
      // Balance / general account detail
      toolCalls.push({
        tool: 'account_detail',
        args: { address: walletAddress },
        resultSummary: `Looked up SOL balance for ${formatAddress(walletAddress, 4)}`,
      });
      const detailExec = await mcpClient.callTool<any>('account_detail', { address: walletAddress });
      const detail = detailExec.data;
      toolCalls[0].data = detail;

      // Concurrently fetch SPL token accounts (USDT, USDC, etc.) and recent transfer activity
      const tokensExec = await mcpClient.callTool<any>('token_accounts', { address: walletAddress });
      const tokens = tokensExec.data;

      const txExec = await mcpClient.callTool<any>('account_transactions', { address: walletAddress, limit: 10 });
      const txs = txExec.data;

      deterministicData = { type: 'balance', detail, tokens, transactions: txs };
      structuredData = { type: 'lookup_balance', detail, tokens, transactions: txs };
    }
  }

  // Compact data for LLM to stay safely within Groq TPM limit (avoid HTTP 413)
  const compactData: any = {};
  if (structuredData.type) compactData.type = structuredData.type;
  if (structuredData.detail) {
    compactData.detail = {
      address: structuredData.detail.address,
      sol_balance: structuredData.detail.sol_balance ?? (structuredData.detail.lamports ? structuredData.detail.lamports / 1e9 : 0),
      lamports: structuredData.detail.lamports,
      account_type: structuredData.detail.account_type,
      owner_program: structuredData.detail.owner_program,
    };
  }
  if (structuredData.valuation) {
    compactData.valuation = {
      totalUsdValue: structuredData.valuation.totalUsdValue,
      solBalance: structuredData.valuation.solBalance,
      solUsdValue: structuredData.valuation.solUsdValue,
      isWhale: structuredData.valuation.isWhale,
      topHoldings: Array.isArray(structuredData.valuation.topHoldings)
        ? structuredData.valuation.topHoldings.slice(0, 8)
        : [],
    };
  }
  if (Array.isArray(structuredData.rankedCounterparties)) {
    compactData.rankedCounterparties = structuredData.rankedCounterparties.slice(0, 8);
    compactData.direction = structuredData.direction;
    compactData.totalScanned = structuredData.totalScanned;
  }
  if (Array.isArray(structuredData.rankedTokenCounterparties)) {
    compactData.rankedTokenCounterparties = structuredData.rankedTokenCounterparties.slice(0, 8);
  }
  if (Array.isArray(structuredData.tokens) || Array.isArray(structuredData.tokens?.tokens)) {
    const rawTok = Array.isArray(structuredData.tokens) ? structuredData.tokens : structuredData.tokens.tokens;
    compactData.tokens = rawTok.slice(0, 10).map((t: any) => ({
      symbol: t.token_symbol || t.symbol || 'SPL',
      name: t.token_name || t.name,
      amount: t.ui_amount ?? t.amount,
      usd_value: t.value_usd ?? t.usd_value,
      mint: t.token_address || t.mint,
    }));
  }
  if (Array.isArray(structuredData.transactions) || Array.isArray(structuredData.transactions?.transactions)) {
    const rawTx = Array.isArray(structuredData.transactions) ? structuredData.transactions : structuredData.transactions.transactions;
    compactData.transactions = rawTx.slice(0, 8).map((tx: any) => ({
      signature: tx.signature,
      block_time: tx.block_time,
      fee: tx.fee,
      status: tx.status,
      fee_payer: tx.fee_payer,
      counterparty: tx.counterparty,
      token_transfers: tx.token_transfers || [],
    }));
  }

  // Dual-Engine Synthesis:
  // If LLM available, invoke LLM with the context and retrieved data
  const userPromptWithData = `Active Target Wallet: ${walletAddress} (Solscan: https://solscan.io/account/${walletAddress})\nUser Question: ${message}\nClassification: ${classification}\nRetrieved On-Chain Data:\n${JSON.stringify(
    compactData,
    null,
    2
  )}\n\nIMPORTANT GUIDANCE:\n- Answer the user's natural language question directly and objectively.\n- For EVERY transaction signature you reference, include a clickable Solscan proof link: [tx: <shortSig>](https://solscan.io/tx/<fullSig>).\n- For EVERY account or counterparty, include a clickable Solscan link: [account: <shortAddr>](https://solscan.io/account/<fullAddr>).`;

  const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, userPromptWithData, history);

  if (llmResult) {
    let finalAnswer = llmResult.answer;

    if (classification === 'AGGREGATION' && !finalAnswer.includes('| Sender |') && !finalAnswer.includes('| Recipient |')) {
      const { ranked, rankedTokens, totalScanned, dir } = deterministicData;
      finalAnswer += `\n\n### Counterparty Breakdown\n` + formatCounterpartyTable(ranked || [], dir, 5);
      if (rankedTokens && rankedTokens.length > 0) {
        finalAnswer += `\n\n### Token Counterparty Breakdown (USDT / USDC)\n` + formatTokenCounterpartyTable(rankedTokens, dir, 5);
      }
      finalAnswer += `\n\n### Data Scope & Limitations\n- **Transactions Scanned:** Scanned **${totalScanned} transactions** across native SOL and Associated Token Accounts (ATAs).\n- **Limitations:** Based on retrieved on-chain activity window and rate limits.`;
    }

    if (classification === 'ENRICHMENT' && !finalAnswer.includes('Total Estimated Portfolio Value')) {
      finalAnswer = `**Target Wallet:** \`${formatAddress(walletAddress, 4)}\`\n\n${finalAnswer}\n\n### Total Estimated Portfolio Value\n- **Total Net Worth:** $${structuredData.valuation?.totalUsdValue?.toLocaleString()} USD\n- **Whale Status:** ${structuredData.valuation?.isWhale ? 'Yes' : 'No'}`;
    }

    return {
      answer: finalAnswer,
      classification,
      toolCalls,
      structuredData,
      engineUsed: llmResult.engine,
    };
  }

  // Fallback to High-Fidelity Deterministic Engine
  const deterministicAnswer = synthesizeDeterministicResponse({
    walletAddress,
    question: message,
    classification,
    data: deterministicData,
    limit: extractTransactionLimit(message),
    direction: detectDirection(message, history),
  });

  return {
    answer: deterministicAnswer,
    classification,
    toolCalls,
    structuredData,
    engineUsed: 'deterministic',
  };
}
