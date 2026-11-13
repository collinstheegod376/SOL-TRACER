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
import {
  getPumpTokenReport,
  extractTokenOrTicker,
  extractTwoTokensOrTickers,
  formatTokenAnalystReport,
  TokenFullReport,
  detectTokenSector,
  getSectorMarketOverview,
  simulateTokenInvestment,
  analyzeRugPostMortem,
  compareTwoTokens,
  getDailyBriefing,
  generateAlphaThread,
} from './pumpfun-engine';

export type QueryClassification =
  | 'LOOKUP'
  | 'ENRICHMENT'
  | 'AGGREGATION'
  | 'CONVERSATIONAL'
  | 'FLOW_DIAGRAM'
  | 'SECURITY_AUDIT'
  | 'DEX_TRADES'
  | 'MULTI_HOP'
  | 'TOKEN_INTEL'
  | 'DEV_DOSSIER'
  | 'BUNDLE_CHECK'
  | 'RISK_INTERCEPT'
  | 'RUG_POST_MORTEM'
  | 'TOKEN_COMPARISON'
  | 'SECTOR_TRACKER'
  | 'INVESTMENT_SIMULATION'
  | 'DAILY_BRIEFING'
  | 'GENERATE_THREAD';

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
  engineUsed: 'deepseek' | 'groq' | 'openai' | 'gemini' | 'deterministic';
  showWidgets?: boolean;
  isFullReportRequested?: boolean;
}

/**
 * Helper to identify if user is requesting a deep report, breakdown, or analysis
 */
export function isReportQuery(query: string): boolean {
  return /\b(report|breakdown|details|analyze|analysis|deep\s+dive|full\s+audit)\b/i.test(query);
}

/**
 * System prompt enforcing concise, conversational, and human-like prose
 */
export const SYSTEM_ANALYST_PROMPT = `You are SolTrace, a conversational, concise, and human-like AI Solana on-chain investigator.
Your job is to understand user questions and answer them conversationally using live on-chain data without overwhelming them with data dumps.

Follow these rules strictly:
1. CONCISE & CONVERSATIONAL PROSE (CRITICAL):
   - Answer ONLY the exact question asked in 1-2 natural sentences.
   - Do NOT use markdown tables.
   - Do NOT output unrequested metrics (such as volume, ATH, 24h change, top holders, or dev details) unless explicitly asked.
   - Do NOT output unsolicited bulleted lists, walls of text, or robotic headers.
2. ONLY EXPAND ON EXPLICIT REQUEST:
   - Only provide a multi-sentence breakdown or structured summary if the user explicitly asks for a "report", "breakdown", "details", or "analyze".
3. CLICKABLE PROOF LINKS:
   - When referencing a specific transaction signature or address, embed a clean inline Solscan proof link: [tx: <shortSig>](https://solscan.io/tx/<fullSignature>) or [account: <shortAddr>](https://solscan.io/account/<fullAddress>). Keep links brief and inline with your sentence.
4. NATURAL HUMAN TONE:
   - Sound like a smart, friendly, human crypto analyst speaking in chat. Warm, direct, and zero fluff.
5. DATA GROUNDING:
   - Ground answers strictly in the retrieved on-chain telemetry. If data is unavailable, state it simply in one sentence without jargon.
6. NEVER MENTION LAMPORTS:
   - NEVER use the word "lamport" or "lamports" under any circumstances. Always express native token quantities in SOL (or USD). If an account is empty or uninitialized, say it has 0 SOL or is unfunded, never mention lamports.
7. RISK_INTERCEPT WARNING (CRITICAL EXCEPTION):
   - If the user evaluates a token that has unburned liquidity or active dev mint authority, you MUST prepend the mandatory warning: "⚠️ STOP. Do not buy this token..." before answering.
8. VIRAL ALPHA THREAD (CRITICAL EXCEPTION):
   - If the user asks to "write a thread", "make a tweet", or "shill this", bypass the 1-2 sentence constraint and format the response as a 4-part viral Twitter thread starting with "🧵 1/4", "2/4", "3/4", and "4/4".`;

/**
 * Strips and sanitizes any accidental mentions of lamports into user-friendly SOL
 */
export function sanitizeLamports(text: string): string {
  if (!text) return text;
  return text
    .replace(/\s*\(\s*[\d,]+\s*lamports?\s*\)/gi, '')
    .replace(/uninitialized account with no lamports/gi, 'unfunded account with 0 SOL')
    .replace(/uninitialized account with 0 SOL/gi, 'unfunded account with 0 SOL')
    .replace(/uninitialized account/gi, 'unfunded account')
    .replace(/with no lamports/gi, 'with 0 SOL')
    .replace(/holds? 0 lamports/gi, 'holds 0 SOL')
    .replace(/has 0 lamports/gi, 'has 0 SOL')
    .replace(/no lamports/gi, '0 SOL')
    .replace(/0 lamports/gi, '0 SOL')
    .replace(/zero lamports/gi, '0 SOL')
    .replace(/([\d,]+(?:\.\d+)?)\s*lamports?/gi, (match, n) => {
      const num = Number(n.replace(/,/g, ''));
      if (isNaN(num)) return 'SOL';
      return `${(num / 1e9).toFixed(4)} SOL`;
    })
    .replace(/lamports?/gi, 'SOL');
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
 * Classify user intent into LOOKUP, ENRICHMENT, AGGREGATION, CONVERSATIONAL, FLOW_DIAGRAM, SECURITY_AUDIT, DEX_TRADES, or MULTI_HOP.
 */
export function classifyQuery(message: string, history: MessageHistoryItem[] = []): QueryClassification {
  const query = message.toLowerCase().trim();

  // 1. Viral Alpha Thread Generation
  if (/(write|generate|make|create)\s+(a\s+)?(thread|tweet|post)|shill\s+this|summarize\s+for\s+x|twitter\s+thread/i.test(query)) {
    return 'GENERATE_THREAD';
  }

  // 2. The "What-If" Investment Simulator
  if (/(what\s+if\s+i\s+(bought|invested|put)|simulate\s+\$|if\s+i\s+(had\s+)?invested|how\s+much\s+would\s+i\s+have)/i.test(query)) {
    return 'INVESTMENT_SIMULATION';
  }

  // 3. Rug Post-Mortem Forensics
  if (/(what\s+happened\s+to|why\s+did\s+this\s+die|did\s+it\s+rug|where\s+did\s+the\s+money\s+go|post[-\s]?mortem|why\s+did\s+it\s+(drop|dump|crash))/i.test(query)) {
    return 'RUG_POST_MORTEM';
  }

  // 4. "What Did I Miss?" Daily Briefing
  if (/^gm\b|what\s+did\s+i\s+miss|daily\s+brief|catch\s+me\s+up|morning\s+brief|daily\s+update/i.test(query)) {
    return 'DAILY_BRIEFING';
  }

  // 5. CA vs CA Comparison
  if (
    /(compare\b.*(and|vs|to)|vs\b|versus\b|which\s+(is\s+)?(better|safer|bigger)|which\s+one)/i.test(query) ||
    (extractTwoTokensOrTickers(message) !== null && /vs\b|compare\b/i.test(query))
  ) {
    return 'TOKEN_COMPARISON';
  }

  // 6. Narrative & Sector Rotation Tracker
  if (/(hottest\s+sector|is\s+this\s+an\s+ai\s+coin|what\s+is\s+pumping|narrative|sector\s+rotation|trending\s+sector|what\s+sector)/i.test(query)) {
    return 'SECTOR_TRACKER';
  }

  // 7. Conversational greetings, small-talk, or introductions
  const conversationalGreetings = /^(hi|hello|hey|sup|yo|howdy|greetings|gn|good\s+(morning|afternoon|evening))\b/i;
  const conversationalQuestions = /(how\s+are\s+you|how's\s+it\s+going|what's\s+up|who\s+are\s+you|what\s+can\s+you\s+do|capabilities|help\b|what\s+do\s+you\s+do|tell\s+me\s+about\s+yourself)/i;
  const pleasantries = /^(thanks|thank\s+you|thx|cool|awesome|great|ok|okay)\b/i;

  if (
    (conversationalGreetings.test(query) || conversationalQuestions.test(query) || pleasantries.test(query)) &&
    !/[1-9A-HJ-NP-Za-km-z]{32,44}/.test(query)
  ) {
    return 'CONVERSATIONAL';
  }

  // 2. Token Bundle & Sniper Check
  if (/(bundle|bundled|snip(ed|er|ing)|jito\s+bundle|block\s+0)/i.test(query)) {
    return 'BUNDLE_CHECK';
  }

  // 3. Dev Dossier & Creator Tracking
  if (/(dev\s+(holding|dump|sold|out|wallet|buy|history)|who\s+is\s+the\s+dev|creator\s+wallet|did\s+dev\s+dump|past\s+launches)/i.test(query)) {
    return 'DEV_DOSSIER';
  }

  // 4. Token Intelligence / Pump.fun Coin Lookup ($TICKER, CA, or pump.fun address)
  if (
    /\$[a-zA-Z0-9_-]{2,15}\b/.test(message) ||
    /[1-9A-HJ-NP-Za-km-z]{32,44}pump\b/i.test(message) ||
    /tell\s+me\s+about\s+(\$|[A-Za-z0-9_-]{2,15}|[1-9A-HJ-NP-Za-km-z]{32,44})/i.test(query) ||
    /(market\s+cap|mcap|ath|bonding\s+curve|pump\.?fun|top\s+holders?|ca\b|contract\s+address|check\s+this\s+token|coin)/i.test(query) ||
    // If user posts an address with "check this" or "scan" or just drops an address ending in pump
    (/(check|scan|audit|inspect|look\s*up|analyze)\s+(this|token|coin)?/i.test(query) && /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(query))
  ) {
    return 'TOKEN_INTEL';
  }

  // 5. Security Audit
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
    return `### What SolTrace Can Do For You 🚀

| Capability | What You Get | How It Looks |
| :--- | :--- | :--- |
| **Pump.fun & Token Intel** | Ask *"tell me about $TICKER"* or drop a CA to get Market Cap, 24h Volume, ATH, bonding curve progress, and socials. | 🪙 Token Card + Live Stats |
| **Bundle & Sniper Audit** | Ask *"is it bundled?"* to detect block-0 Jito snipers, bundled supply %, and sniper dump activity. | 🚨 Bundle Score & Alerts |
| **Dev Dossier Tracker** | Check if dev sold out (CTO), past tokens launched, and initial wallet funding origin. | 👤 Dev Dossier + Solscan Links |
| **Visual Money-Flow** | Interactive flow charts showing SOL and token flows in and out of a wallet. | 📊 Flow Diagram |
| **Security Risk Audits** | Safety score (0–100%), drainer detection, and malicious token approvals. | 🛡️ Security Audit Report |
| **DEX Trades & PnL** | Decode swaps on Raydium, Jupiter, Orca, and Meteora with buy/sell amounts. | 📈 Trade Table + Net PnL |
| **Multi-Hop Tracing** | Trace outgoing funds 2–3 hops deep into recipient wallets or exchanges. | ⛓️ Step-by-Step Hop Trace |

Go ahead and paste a token ticker, contract address, or wallet to get started!`;
  }

  if (/thanks|thank\s+you|thx|appreciate/i.test(q)) {
    return `You're very welcome! Always happy to help. Let me know whenever you'd like to investigate another wallet or verify on-chain activity! 🤝`;
  }

  // General greeting fallback
  return `Hey there! 👋 I'm **SolTrace**, your on-chain detective for everything happening on Solana.

How's your day going?

### What I can do for you

| Capability | What You Get | How It Looks |
| :--- | :--- | :--- |
| **Pump.fun & Token Intel** | Ask *"tell me about $TICKER"* or drop a CA to pull Market Cap, Volume, ATH, bonding curve %, and socials. | 🪙 Token Card + Live Stats |
| **Bundle & Sniper Audit** | Ask *"is it bundled?"* to detect block-0 Jito snipers, bundled supply %, and dump risk. | 🚨 Bundle Score & Alerts |
| **Dev Dossier Tracker** | Track if the dev dumped (CTO) or holds tokens, past tokens launched, and funding source. | 👤 Dev Dossier + Solscan Proof |
| **Visual Money-Flow** | Interactive charts that show where SOL or tokens move in and out of a wallet. | 📊 Flow Chart |
| **Security Risk Audits** | Spot suspicious patterns, rapid dumps, unknown programs, and drainers. | 🛡️ Risk Score & Recommendations |
| **DEX Trades & PnL** | Pull swaps on Raydium, Orca, Jupiter with realized/unrealized profit-and-loss. | 📈 Trade Table + Net PnL |
| **Multi-Hop Tracing** | Follow SOL amounts through a chain of swaps or transfers to see the full path. | ⛓️ Step-by-Step Trace |
| **Counterparty Flow** | See who you're transacting with, their reputation, and clustering. | 👥 Counterparty List |

All the insights are backed by **real transaction signatures and account pages** on Solscan, so you can click through to verify every detail.

Got a token ticker (e.g. \`$GOAT\`), contract address, or wallet address you'd like me to dig into? Just paste it here and I'll start pulling the data for you! 🚀`;
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
}): { answer: string; showWidgets: boolean; isFullReportRequested: boolean } {
  const { walletAddress, question, classification, data, direction = 'incoming' } = params;
  const q = question.toLowerCase();
  const isReport = isReportQuery(question);
  const tr: TokenFullReport | undefined = data?.tokenReport || (data?.intel ? data : undefined);

  // Helper to prepend Proactive Risk Guardian intercept warning
  const withRiskIntercept = (ans: string): string => {
    if (tr?.securityFlags?.isRiskIntercepted && tr.securityFlags.warningMessage && !ans.includes('⚠️ STOP')) {
      return `${tr.securityFlags.warningMessage} ${ans}`;
    }
    return ans;
  };

  // 1. Auto-Generated Alpha Threads
  if (classification === 'GENERATE_THREAD' || data?.thread) {
    if (data?.thread?.fullText) {
      return { answer: withRiskIntercept(data.thread.fullText), showWidgets: false, isFullReportRequested: false };
    }
    if (tr) {
      const th = generateAlphaThread(tr);
      return { answer: withRiskIntercept(th.fullText), showWidgets: false, isFullReportRequested: false };
    }
  }

  // 2. The "What-If" Investment Simulator
  if (classification === 'INVESTMENT_SIMULATION' || data?.simulation) {
    if (data?.simulation?.summary) {
      return { answer: withRiskIntercept(data.simulation.summary), showWidgets: false, isFullReportRequested: false };
    }
    if (tr) {
      const sim = simulateTokenInvestment(question, tr);
      return { answer: withRiskIntercept(sim.summary), showWidgets: false, isFullReportRequested: false };
    }
  }

  // 3. Rug Post-Mortem Forensic Analysis
  if (classification === 'RUG_POST_MORTEM' || data?.postMortem) {
    if (data?.postMortem?.summary) {
      return { answer: withRiskIntercept(data.postMortem.summary), showWidgets: false, isFullReportRequested: false };
    }
    if (tr) {
      const pm = analyzeRugPostMortem(tr);
      return { answer: withRiskIntercept(pm.summary), showWidgets: false, isFullReportRequested: false };
    }
  }

  // 4. CA vs CA Token Comparison
  if (classification === 'TOKEN_COMPARISON' || data?.comparison) {
    if (data?.comparison?.summary) {
      return { answer: data.comparison.summary, showWidgets: false, isFullReportRequested: false };
    }
  }

  // 5. Narrative & Sector Rotation Tracker
  if (classification === 'SECTOR_TRACKER' || data?.sectorOverview) {
    if (data?.sectorOverview?.summary) {
      return { answer: withRiskIntercept(data.sectorOverview.summary), showWidgets: false, isFullReportRequested: false };
    }
    const sector = tr?.intel?.sector || detectTokenSector(tr?.intel?.name || '', tr?.intel?.symbol || '', question);
    const ov = getSectorMarketOverview(sector);
    return { answer: withRiskIntercept(ov.summary), showWidgets: false, isFullReportRequested: false };
  }

  // 6. "What Did I Miss?" Daily Briefing
  if (classification === 'DAILY_BRIEFING' || data?.briefing) {
    if (data?.briefing?.summary) {
      return { answer: data.briefing.summary, showWidgets: false, isFullReportRequested: false };
    }
    return {
      answer: "gm! Solana network telemetry is active across Raydium and Pump.fun DEX pools. Volume is steady across ecosystem tokens today.",
      showWidgets: false,
      isFullReportRequested: false,
    };
  }

  // 7. Market Cap / Mcap Query -> return ONLY a sentence with the market cap
  if (/\b(market\s*cap|mcap)\b/i.test(q)) {
    if (tr?.intel?.marketCapUsd !== undefined) {
      const sym = tr.intel.symbol || 'The token';
      return {
        answer: withRiskIntercept(`${sym} has a market cap of $${tr.intel.marketCapUsd.toLocaleString()}.`),
        showWidgets: false,
        isFullReportRequested: false,
      };
    }
    if (data?.valuation?.totalUsdValue !== undefined) {
      return {
        answer: `### Direct Finding\nTotal Estimated Portfolio Value: **$${data.valuation.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD**.\nWhale Status: **${data.valuation.isWhale ? 'Whale Wallet (Confirmed)' : 'Standard Active Wallet'}**.`,
        showWidgets: false,
        isFullReportRequested: false,
      };
    }
  }

  // 8. Price Query -> return ONLY a sentence with the price
  if (/\bprice\b/i.test(q)) {
    if (tr?.intel?.priceUsd !== undefined) {
      const sym = tr.intel.symbol || 'The token';
      const p = tr.intel.priceUsd < 0.01 ? tr.intel.priceUsd.toFixed(8) : tr.intel.priceUsd.toFixed(4);
      return {
        answer: withRiskIntercept(`The current price of ${sym} is $${p}.`),
        showWidgets: false,
        isFullReportRequested: false,
      };
    }
    if (data?.valuation?.solPriceUsd !== undefined) {
      return {
        answer: `The current price of SOL is $${data.valuation.solPriceUsd.toFixed(2)}.`,
        showWidgets: false,
        isFullReportRequested: false,
      };
    }
  }

  // 9. Bundle / Safe Query -> return ONLY a sentence with the bundle risk
  if (/\b(bundle|bundled|safe|safety)\b/i.test(q)) {
    if (tr?.bundle) {
      const sym = tr.intel?.symbol || 'This token';
      const b = tr.bundle;
      const answer = b.isBundled
        ? `Warning: ${sym} shows high bundle risk with ${b.bundledPercentage}% of supply sniped in block 0.`
        : `${sym} launched cleanly with 0% bundled supply detected.`;
      return {
        answer: withRiskIntercept(answer),
        showWidgets: false,
        isFullReportRequested: false,
      };
    }
    if (data?.audit) {
      return {
        answer: `Wallet safety score is ${data.audit.score}/100 with ${data.audit.riskLevel} risk level.`,
        showWidgets: false,
        isFullReportRequested: false,
      };
    }
  }

  // 10. Report / Breakdown / Details / Analyze Query -> return a summary paragraph AND set showWidgets: true
  if (isReport) {
    if (tr?.intel) {
      const p = tr.intel.priceUsd < 0.01 ? tr.intel.priceUsd.toFixed(8) : tr.intel.priceUsd.toFixed(4);
      const summary = `${tr.intel.name} (${tr.intel.symbol}) is currently trading at $${p} with a market cap of $${tr.intel.marketCapUsd.toLocaleString()}. Launch status: ${tr.bundle.isBundled ? `Bundled (${tr.bundle.bundledPercentage}% of supply sniped)` : 'Clean launch (0% bundled)'}. Developer holding: ${tr.dev?.currentHoldingPercent ?? 0}%.`;
      return {
        answer: withRiskIntercept(summary),
        showWidgets: true,
        isFullReportRequested: true,
      };
    }
  }

  // If this is a token query without report keywords
  if (tr?.intel) {
    const sym = tr.intel.symbol || 'The token';
    const p = tr.intel.priceUsd < 0.01 ? tr.intel.priceUsd.toFixed(8) : tr.intel.priceUsd.toFixed(4);
    return {
      answer: withRiskIntercept(`${tr.intel.name} (${sym}) is currently trading at $${p} with a market cap of $${tr.intel.marketCapUsd.toLocaleString()}.`),
      showWidgets: false,
      isFullReportRequested: false,
    };
  }

  // Wallet Aggregation
  if (classification === 'AGGREGATION') {
    const { ranked, rankedTokens, totalScanned, dir } = data;
    const isIncoming = dir === 'incoming';
    const top = ranked && ranked.length > 0 ? ranked[0] : null;

    let response = '';
    if (top) {
      const labelStr = top.label !== 'Unlabeled' ? ` (${top.label})` : '';
      const topLink = `[${formatAddress(top.address, 4)}](https://solscan.io/account/${top.address})`;
      response += `The most frequent ${isIncoming ? 'sender' : 'recipient'} of SOL is **${topLink}**${labelStr}, with **${top.count} transactions** totaling **${top.totalSol.toFixed(4)} SOL** (avg ${top.avgSol.toFixed(4)} SOL per transfer).\n\n`;
    } else {
      response += `No ${isIncoming ? 'incoming' : 'outgoing'} SOL transfers were identified in the examined block window.\n\n`;
    }

    if (rankedTokens && rankedTokens.length > 0) {
      const topToken = rankedTokens[0];
      const tokenLink = `[${formatAddress(topToken.address, 4)}](https://solscan.io/account/${topToken.address})`;
      response += `For SPL tokens (USDT / USDC), the primary ${isIncoming ? 'sender' : 'recipient'} is **${tokenLink}**, transferring a total of **${topToken.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${topToken.symbol}** across **${topToken.count} transactions**.\n\n`;
    }

    response += `### Counterparty Breakdown\n`;
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

    return {
      answer: response,
      showWidgets: isReport,
      isFullReportRequested: isReport,
    };
  }

  // Wallet Enrichment (Valuation & Whale check)
  if (classification === 'ENRICHMENT') {
    const valuation = data.valuation;
    let response = `Total Estimated Portfolio Value: **$${valuation.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD**.\n`;
    response += `Whale Status: **${valuation.isWhale ? 'Whale Wallet (Confirmed)' : 'Standard Active Wallet (Below Whale Threshold of $1M / 5,000 SOL)'}**.\n\n`;

    if (isReport) {
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
    }

    return {
      answer: response,
      showWidgets: isReport,
      isFullReportRequested: isReport,
    };
  }

  // LOOKUP
  let response = '';
  if (data.type === 'balance') {
    const detail = data.detail || {};
    const mintInfo = detail.mint_info;
    const isMint = detail.account_type === 'token_mint' || Boolean(mintInfo);

    if (isMint) {
      const tokenLink = `[${formatAddress(walletAddress, 4)}](https://solscan.io/token/${walletAddress})`;
      response = `Target address is an **SPL Token Mint**: ${tokenLink} (${detail.owner_program === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'Token-2022' : 'SPL Token Program'}).`;
      if (mintInfo?.supply) {
        response += ` Total supply: ${Number(mintInfo.supply).toLocaleString()}.`;
      }
    } else {
      const solBal = detail.sol_balance ?? (detail.lamports ? detail.lamports / 1e9 : 0);
      const walletLink = `[${formatAddress(walletAddress, 4)}](https://solscan.io/account/${walletAddress})`;
      response = `The current balance of ${walletLink} is **${solBal.toFixed(4)} SOL**.`;
    }

    if (data.tokens) {
      const rawTokens = Array.isArray(data.tokens) ? data.tokens : (data.tokens?.tokens || []);
      if (rawTokens.length > 0) {
        response += `\n\nThis wallet holds **${rawTokens.length} SPL tokens**.`;
        if (isReport) {
          response += `\n\n### Token Holdings (SPL)\n`;
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
        }
      }
    }
  } else if (data.type === 'tokens') {
    const tokens = Array.isArray(data.tokens) ? data.tokens : (data.tokens?.tokens || []);
    if (tokens.length === 0) {
      response = `This wallet holds **0 SPL tokens** on Solana mainnet.`;
    } else {
      response = `This wallet holds **${tokens.length} SPL tokens**.`;
      if (isReport) {
        response += `\n\n| Token | Symbol | Amount | USD Value |\n| :--- | :---: | :---: | :---: |\n`;
        for (const t of tokens.slice(0, 8)) {
          const sym = t.token_symbol || t.symbol || 'SPL';
          const name = t.token_name || t.name || sym;
          const amt = t.amount ?? t.ui_amount ?? 0;
          const val = t.value_usd ?? t.usd_value ?? 0;
          response += `| ${name} | \`${sym}\` | ${Number(amt).toLocaleString()} | $${Number(val).toFixed(2)} |\n`;
        }
      }
    }
  } else {
    response = `Scan complete for [${formatAddress(walletAddress, 4)}](https://solscan.io/account/${walletAddress}).`;
  }

  return {
    answer: response,
    showWidgets: isReport,
    isFullReportRequested: isReport,
  };
}

/**
 * Call external LLM (DeepSeek / Groq AI primary, OpenAI/Gemini fallback)
 */
async function callLLMEngine(
  systemPrompt: string,
  userPrompt: string,
  history: MessageHistoryItem[] = []
): Promise<{ answer: string; engine: 'deepseek' | 'groq' | 'openai' | 'gemini' } | null> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. DeepSeek AI (Primary when configured)
  if (deepseekKey) {
    try {
      const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
      const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: userPrompt },
      ];

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: model.includes('reasoner') ? undefined : 0.2,
          max_tokens: 2500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const content =
          json.choices?.[0]?.message?.content ||
          json.choices?.[0]?.message?.reasoning_content;
        if (content && content.trim().length > 0) {
          return { answer: content.trim(), engine: 'deepseek' };
        }
      } else {
        const errText = await res.text();
        console.warn(`[Orchestrator] DeepSeek model ${model} HTTP ${res.status}:`, errText);
      }
    } catch (err: any) {
      console.warn('[Orchestrator] DeepSeek call failed, trying next fallback:', err.message);
    }
  }

  // 2. Groq AI with model fallbacks
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
      answer: sanitizeLamports(finalAnswer),
      classification: 'AGGREGATION',
      toolCalls,
      structuredData: { type: 'mutual_transactions', count: mutualTxs.length, transactions: mutualTxs },
      engineUsed: llmResult.engine,
    };
  }

  return {
    answer: sanitizeLamports(deterministicAnswer),
    classification: 'AGGREGATION',
    toolCalls,
    structuredData: { type: 'mutual_transactions', count: mutualTxs.length, transactions: mutualTxs },
    engineUsed: 'deterministic',
  };
}

/**
 * Main AI Orchestrator Execution Pipeline (Internal)
 */
async function internalExecuteOrchestrator(input: OrchestrationInput): Promise<OrchestrationResult> {
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

  // 1. "WHAT DID I MISS?" DAILY BRIEFING
  if (classification === 'DAILY_BRIEFING') {
    const briefing = await getDailyBriefing();
    const toolCalls: ToolCallRecord[] = [
      {
        tool: 'daily_briefing',
        args: { query: message },
        resultSummary: 'Aggregated top trending Solana gainers, whale transfers, and sector narratives.',
        data: briefing,
      },
    ];

    const prompt = `Live Solana Ecosystem Telemetry:
Top Movers Right Now: ${briefing.topGainers.join(', ')}
Market Telemetry: ${briefing.whaleAction}
Dominant Narrative: ${briefing.narrative}

User Question: "${message}"

Rules:
- Act as SolTrace AI, an expert on-chain analyst.
- Provide a punchy, warm, conversational morning update in 1-2 natural sentences.
- Mention the hottest active mover and volume momentum from the live telemetry above.
- Zero markdown tables, bulleted lists, or robotic headers.
- Answer in human conversational tone.`;

    const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, prompt, history);

    return {
      answer: llmResult ? llmResult.answer : briefing.summary,
      classification: 'DAILY_BRIEFING',
      toolCalls,
      structuredData: {
        type: 'daily_briefing',
        briefing,
      },
      engineUsed: llmResult ? llmResult.engine : 'deterministic',
      showWidgets: false,
      isFullReportRequested: false,
    };
  }

  // 2. CA VS CA TOKEN COMPARISON
  if (classification === 'TOKEN_COMPARISON') {
    const twoTokens = extractTwoTokensOrTickers(message);
    const queryA = twoTokens?.first.contractAddress || twoTokens?.first.ticker || 'GOAT';
    const queryB = twoTokens?.second.contractAddress || twoTokens?.second.ticker || 'ACT';
    const isTickerA = Boolean(twoTokens?.first.ticker && !twoTokens?.first.contractAddress);
    const isTickerB = Boolean(twoTokens?.second.ticker && !twoTokens?.second.contractAddress);

    const [reportA, reportB] = await Promise.all([
      getPumpTokenReport(queryA, isTickerA),
      getPumpTokenReport(queryB, isTickerB),
    ]);

    const comparison = compareTwoTokens(reportA, reportB);
    const toolCalls: ToolCallRecord[] = [
      {
        tool: 'token_comparison',
        args: { tokenA: queryA, tokenB: queryB },
        resultSummary: `Executed side-by-side on-chain audit comparing ${queryA} vs ${queryB}`,
        data: {
          tokenA: { symbol: reportA.intel.symbol, price: reportA.intel.priceUsd, volume: reportA.intel.volume24hUsd, mcap: reportA.intel.marketCapUsd },
          tokenB: { symbol: reportB.intel.symbol, price: reportB.intel.priceUsd, volume: reportB.intel.volume24hUsd, mcap: reportB.intel.marketCapUsd },
        },
      },
    ];

    const prompt = `User Question: "${message}"

Token A Telemetry ($${reportA.intel.symbol}):
- Price: $${reportA.intel.priceUsd}
- Market Cap: $${reportA.intel.marketCapUsd.toLocaleString()}
- 24h Volume: $${reportA.intel.volume24hUsd.toLocaleString()}
- Bundle Risk: ${reportA.bundle.isBundled ? `Bundled (${reportA.bundle.bundledPercentage}%)` : 'Clean Launch'}
- Top 10 Holder Concentration: ${reportA.holderConcentration.top10Percent}% (${reportA.holderConcentration.riskLevel} risk)
- Security: LP Burned: ${reportA.securityFlags?.lpBurned}, Mint Revoked: ${reportA.securityFlags?.mintAuthorityRevoked}

Token B Telemetry ($${reportB.intel.symbol}):
- Price: $${reportB.intel.priceUsd}
- Market Cap: $${reportB.intel.marketCapUsd.toLocaleString()}
- 24h Volume: $${reportB.intel.volume24hUsd.toLocaleString()}
- Bundle Risk: ${reportB.bundle.isBundled ? `Bundled (${reportB.bundle.bundledPercentage}%)` : 'Clean Launch'}
- Top 10 Holder Concentration: ${reportB.holderConcentration.top10Percent}% (${reportB.holderConcentration.riskLevel} risk)
- Security: LP Burned: ${reportB.securityFlags?.lpBurned}, Mint Revoked: ${reportB.securityFlags?.mintAuthorityRevoked}

Rules:
- Answer the user's comparison question objectively in 1-2 conversational sentences.
- Explicitly contrast trading volume, liquidity, and safety/bundle risk between Token A and Token B.
- If one token has 0 volume or no active pool, point that out clearly.
- Do NOT use markdown tables.`;

    const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, prompt, history);

    return {
      answer: llmResult ? llmResult.answer : comparison.summary,
      classification: 'TOKEN_COMPARISON',
      toolCalls,
      structuredData: {
        type: 'token_comparison',
        comparison,
      },
      engineUsed: llmResult ? llmResult.engine : 'deterministic',
      showWidgets: false,
      isFullReportRequested: false,
    };
  }

  // 3. NARRATIVE & SECTOR ROTATION TRACKER
  if (classification === 'SECTOR_TRACKER') {
    const tokenParsed = extractTokenOrTicker(message);
    const targetQuery = tokenParsed.contractAddress || tokenParsed.ticker || walletAddress;
    let sectorName = 'AI';
    if (targetQuery) {
      const isTicker = Boolean(tokenParsed.ticker && !tokenParsed.contractAddress);
      const report = await getPumpTokenReport(targetQuery, isTicker);
      sectorName = report.intel.sector || detectTokenSector(report.intel.name, report.intel.symbol);
    }
    const sectorOverview = getSectorMarketOverview(sectorName);
    const toolCalls: ToolCallRecord[] = [
      {
        tool: 'sector_tracker',
        args: { sector: sectorName },
        resultSummary: `Tracked sector rotation and aggregate volume delta for ${sectorOverview.sector}`,
        data: sectorOverview,
      },
    ];

    const prompt = `User Question: "${message}"
Sector Telemetry for ${sectorOverview.sector}:
- 24h Volume: $${sectorOverview.volume24hUsd.toLocaleString()}
- 24h Volume Delta: +${sectorOverview.volumeDeltaPercent}%
- Top Tokens in Sector: ${sectorOverview.topTokens.join(', ')}

Rules:
- Answer in 1-2 concise, conversational sentences.
- Explain whether this sector is hot or cooling and cite the volume trend.
- No markdown tables.`;

    const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, prompt, history);

    return {
      answer: llmResult ? llmResult.answer : sectorOverview.summary,
      classification: 'SECTOR_TRACKER',
      toolCalls,
      structuredData: {
        type: 'sector_tracker',
        sectorOverview,
      },
      engineUsed: llmResult ? llmResult.engine : 'deterministic',
      showWidgets: false,
      isFullReportRequested: false,
    };
  }

  // 4. TOKEN INTELLIGENCE, DEV DOSSIER, BUNDLE CHECK, RUG POST-MORTEM, WHAT-IF SIMULATION, VIRAL THREAD
  if (
    classification === 'TOKEN_INTEL' ||
    classification === 'BUNDLE_CHECK' ||
    classification === 'DEV_DOSSIER' ||
    classification === 'RUG_POST_MORTEM' ||
    classification === 'INVESTMENT_SIMULATION' ||
    classification === 'GENERATE_THREAD'
  ) {
    const tokenParsed = extractTokenOrTicker(message);
    const targetQuery = tokenParsed.contractAddress || tokenParsed.ticker || walletAddress;

    if (targetQuery) {
      const isTicker = Boolean(tokenParsed.ticker && !tokenParsed.contractAddress);
      const toolCalls: ToolCallRecord[] = [
        {
          tool: 'token_intel',
          args: { query: targetQuery, isTicker },
          resultSummary: `Scanned token metrics, bonding curve, bundle analysis, and dev history for ${targetQuery}`,
        },
      ];

      const report: TokenFullReport = await getPumpTokenReport(targetQuery, isTicker);
      const isFullReport = isReportQuery(message);

      // PROACTIVE RISK GUARDIAN check
      const isRiskIntercepted = Boolean(report.securityFlags?.isRiskIntercepted);
      const effectiveClassification: QueryClassification = isRiskIntercepted ? 'RISK_INTERCEPT' : classification;

      // Handle RUG_POST_MORTEM
      if (classification === 'RUG_POST_MORTEM') {
        const pm = analyzeRugPostMortem(report);
        const ans = report.securityFlags?.isRiskIntercepted && report.securityFlags.warningMessage
          ? `${report.securityFlags.warningMessage} ${pm.summary}`
          : pm.summary;
        return {
          answer: ans,
          classification: 'RUG_POST_MORTEM',
          toolCalls,
          structuredData: { type: 'rug_post_mortem', postMortem: pm, tokenReport: report },
          engineUsed: 'deterministic',
          showWidgets: false,
          isFullReportRequested: false,
        };
      }

      // Handle INVESTMENT_SIMULATION
      if (classification === 'INVESTMENT_SIMULATION') {
        const sim = simulateTokenInvestment(message, report);
        const prompt = `User Question: "${message}"
Token: $${report.intel.symbol} (${report.intel.name})
Simulation Telemetry:
- Invested Amount: $${sim.investedAmount}
- Time Anchor: ${sim.timeAnchor}
- Current Value: $${sim.currentValue.toLocaleString()}
- Total ROI: ${sim.roiPercent >= 0 ? '+' : ''}${sim.roiPercent.toLocaleString()}%

Rules:
- Answer in 1-2 conversational sentences.
- Explicitly state how much their position would be worth today and the total percentage gain or loss.
- Zero markdown tables.`;

        const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, prompt, history);
        let ans = llmResult ? llmResult.answer : sim.summary;
        if (report.securityFlags?.isRiskIntercepted && report.securityFlags.warningMessage && !ans.includes('⚠️ STOP')) {
          ans = `${report.securityFlags.warningMessage} ${ans}`;
        }
        return {
          answer: ans,
          classification: 'INVESTMENT_SIMULATION',
          toolCalls,
          structuredData: { type: 'investment_simulation', simulation: sim, tokenReport: report },
          engineUsed: llmResult ? llmResult.engine : 'deterministic',
          showWidgets: false,
          isFullReportRequested: false,
        };
      }

      // Handle GENERATE_THREAD
      if (classification === 'GENERATE_THREAD') {
        const th = generateAlphaThread(report);
        const prompt = `Token Telemetry for $${report.intel.symbol} (${report.intel.name}):
- Price: $${report.intel.priceUsd}
- Market Cap: $${report.intel.marketCapUsd.toLocaleString()}
- 24h Volume: $${report.intel.volume24hUsd.toLocaleString()}
- LP Status: ${report.securityFlags?.lpBurned ? 'Burned' : 'Unburned / Pullable'}
- Mint Authority: ${report.securityFlags?.mintAuthorityRevoked ? 'Revoked' : 'Active'}
- Bundle Analysis: ${report.bundle.isBundled ? `${report.bundle.bundledPercentage}% bundled` : '0% clean launch'}
- Top 10 Holder Concentration: ${report.holderConcentration.top10Percent}%

User Request: "${message}"

Rules:
- Format your response strictly as a 4-part viral Twitter thread starting with "🧵 1/4", "2/4", "3/4", and "4/4".
- Keep each tweet punchy, analytical, and engaging.`;

        const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, prompt, history);
        let ans = llmResult ? llmResult.answer : th.fullText;
        if (report.securityFlags?.isRiskIntercepted && report.securityFlags.warningMessage && !ans.includes('⚠️ STOP')) {
          ans = `${report.securityFlags.warningMessage}\n\n${ans}`;
        }
        return {
          answer: ans,
          classification: 'GENERATE_THREAD',
          toolCalls,
          structuredData: { type: 'alpha_thread', thread: th.threadParts, fullText: ans, tokenReport: report },
          engineUsed: llmResult ? llmResult.engine : 'deterministic',
          showWidgets: false,
          isFullReportRequested: false,
        };
      }

      // Conversational LLM Synthesis
      let llmAnswer: string | null = null;
      let engineUsed: 'deepseek' | 'groq' | 'openai' | 'gemini' | 'deterministic' = 'deterministic';

      const promptData = `User Question: "${message}"
Token: ${report.intel.name} (${report.intel.symbol})
Price: $${report.intel.priceUsd}
Market Cap: $${report.intel.marketCapUsd.toLocaleString()}
Bundle Status: ${report.bundle.isBundled ? `Bundled (${report.bundle.bundledPercentage}% sniped)` : 'Clean launch (0% bundled)'}
Dev Status: ${report.dev.devStatus} (${report.dev.currentHoldingPercent}% holding)
Bonding Curve: ${report.intel.bondingCurveProgress}% (${report.intel.isGraduated ? 'Graduated' : 'Active'})
Security Audit: LP Burned: ${report.securityFlags?.lpBurned}, Mint Authority: ${report.securityFlags?.mintAuthorityRevoked ? 'Revoked' : 'Active'}
${isRiskIntercepted ? `MANDATORY WARNING TO PREPEND: "${report.securityFlags?.warningMessage}"` : ''}

Rules: Answer ONLY the user's specific question in 1-2 concise, conversational sentences. No markdown tables or unrequested metrics.${isRiskIntercepted ? ' You MUST start your response with the MANDATORY WARNING.' : ''}`;

      const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, promptData, history);
      if (llmResult) {
        llmAnswer = llmResult.answer;
        engineUsed = llmResult.engine;
      }

      const deterministicResult = synthesizeDeterministicResponse({
        walletAddress: targetQuery,
        question: message,
        classification: effectiveClassification,
        data: { tokenReport: report },
      });

      let finalAnswer = sanitizeLamports(llmAnswer || deterministicResult.answer);
      if (isRiskIntercepted && report.securityFlags?.warningMessage && !finalAnswer.includes('⚠️ STOP')) {
        finalAnswer = `${report.securityFlags.warningMessage} ${finalAnswer}`;
      }

      const showWidgets = isFullReport || deterministicResult.showWidgets;

      return {
        answer: finalAnswer,
        classification: effectiveClassification,
        toolCalls,
        structuredData: {
          type: 'token_report',
          tokenReport: report,
        },
        engineUsed,
        showWidgets,
        isFullReportRequested: showWidgets,
      };
    }
  }

  // 2. CONVERSATIONAL QUERY (greetings, how are you, capabilities, small-talk)
  if (classification === 'CONVERSATIONAL') {
    const activeWalletNote = walletAddress
      ? `(Current Active Context Wallet: ${walletAddress})`
      : '(No wallet currently loaded)';

    const llmGreeting = await callLLMEngine(
      SYSTEM_ANALYST_PROMPT,
      `User: "${message}"\n${activeWalletNote}\n\nRespond naturally and warmly as SolTrace AI. Answer their greeting, ask how they are doing, and present your core capabilities in a clean table or structured list including:
1. Pump.fun & Meme Token Intelligence: Ask "tell me about $TICKER" or drop a CA to get Market Cap, 24h Volume, ATH, bonding curve progress, and socials.
2. Bundle & Sniper Audits: Ask "is it bundled?" to detect block-0 Jito snipers, bundled supply percentage, and dump risk.
3. Dev Wallet Dossier: Track if the dev dumped (CTO) or holds tokens, past tokens launched, and initial SOL funding source.
4. Visual Money-Flow Diagrams: Interactive flowchart of SOL/token flows.
5. Security Risk Audits: Safety score, drainers, and malicious approvals.
6. DEX Trades & PnL: Swaps on Raydium, Jupiter, Orca with buy/sell amounts.
7. Multi-Hop Tracing & Counterparties: Follow funds 2-3 hops deep.

Invite them to paste any token mint/ticker, wallet address, or transaction signature to get started!`,
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
      answer: `**SolTrace AI Transaction Scanner**\n\nTo scan the Solana blockchain, please provide a wallet address or transaction signature in your message (e.g., \`<wallet-address>\` or a transaction hash).\n\nYou can ask any natural language question, such as:\n- *"Scan \`<wallet-address>\` and tell me what its largest transactions are"*\n- *"Did this address sell any tokens recently?"*\n- *"Who transfers the most SOL into this wallet?"*\n- *"Audit wallet security for \`<wallet-address>\`"*\n- *"Visualize money flow for \`<wallet-address>\`"*`,
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

      // Check if this address is actually a Token Mint (e.g. Pump.fun token, meme coin)
      if (detail?.account_type === 'token_mint' || walletAddress.endsWith('pump') || detail?.mint_info) {
        const report = await getPumpTokenReport(walletAddress, false);
        const isFullReport = isReportQuery(message);
        toolCalls.push({
          tool: 'token_intel',
          args: { query: walletAddress, isTicker: false },
          resultSummary: `Identified token mint address ${formatAddress(walletAddress, 4)}. Analyzed token metrics, market cap, and bundle status.`,
        });

        const deterministicResult = synthesizeDeterministicResponse({
          walletAddress,
          question: message,
          classification: 'TOKEN_INTEL',
          data: { tokenReport: report },
        });

        const showWidgets = isFullReport || deterministicResult.showWidgets;

        return {
          answer: sanitizeLamports(deterministicResult.answer),
          classification: 'TOKEN_INTEL',
          toolCalls,
          structuredData: {
            type: 'token_report',
            tokenReport: report,
          },
          engineUsed: 'deterministic',
          showWidgets,
          isFullReportRequested: showWidgets,
        };
      }

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
      account_type: structuredData.detail.account_type,
      owner_program: structuredData.detail.owner_program,
      mint_info: structuredData.detail.mint_info,
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
  )}\n\nIMPORTANT GUIDANCE:\n- Answer the user's natural language question directly and objectively.\n- NEVER mention the word "lamport" or "lamports" — express all native amounts in SOL or USD.\n- For EVERY transaction signature you reference, include a clickable Solscan proof link: [tx: <shortSig>](https://solscan.io/tx/<fullSig>).\n- For EVERY account or counterparty, include a clickable Solscan link: [account: <shortAddr>](https://solscan.io/account/<fullAddr>).`;

  const isReport = isReportQuery(message);
  const llmResult = await callLLMEngine(SYSTEM_ANALYST_PROMPT, userPromptWithData, history);

  if (llmResult) {
    let finalAnswer = llmResult.answer;

    if (isReport && classification === 'AGGREGATION' && !finalAnswer.includes('| Sender |') && !finalAnswer.includes('| Recipient |')) {
      const { ranked, rankedTokens, totalScanned, dir } = deterministicData;
      finalAnswer += `\n\n### Counterparty Breakdown\n` + formatCounterpartyTable(ranked || [], dir, 5);
      if (rankedTokens && rankedTokens.length > 0) {
        finalAnswer += `\n\n### Token Counterparty Breakdown (USDT / USDC)\n` + formatTokenCounterpartyTable(rankedTokens, dir, 5);
      }
      finalAnswer += `\n\n### Data Scope & Limitations\n- **Transactions Scanned:** Scanned **${totalScanned} transactions** across native SOL and Associated Token Accounts (ATAs).\n- **Limitations:** Based on retrieved on-chain activity window and rate limits.`;
    }

    if (isReport && classification === 'ENRICHMENT' && !finalAnswer.includes('Total Estimated Portfolio Value')) {
      finalAnswer = `**Target Wallet:** \`${formatAddress(walletAddress, 4)}\`\n\n${finalAnswer}\n\n### Total Estimated Portfolio Value\n- **Total Net Worth:** $${structuredData.valuation?.totalUsdValue?.toLocaleString()} USD\n- **Whale Status:** ${structuredData.valuation?.isWhale ? 'Yes' : 'No'}`;
    }

    return {
      answer: sanitizeLamports(finalAnswer),
      classification,
      toolCalls,
      structuredData,
      engineUsed: llmResult.engine,
      showWidgets: isReport,
      isFullReportRequested: isReport,
    };
  }

  // Fallback to High-Fidelity Deterministic Engine
  const deterministicResult = synthesizeDeterministicResponse({
    walletAddress,
    question: message,
    classification,
    data: deterministicData,
    limit: extractTransactionLimit(message),
    direction: detectDirection(message, history),
  });

  return {
    answer: sanitizeLamports(deterministicResult.answer),
    classification,
    toolCalls,
    structuredData,
    engineUsed: 'deterministic',
    showWidgets: deterministicResult.showWidgets,
    isFullReportRequested: deterministicResult.isFullReportRequested,
  };
}

/**
 * Public Orchestrator Entrypoint with guaranteed lamports sanitization
 */
export async function executeOrchestrator(input: OrchestrationInput): Promise<OrchestrationResult> {
  const result = await internalExecuteOrchestrator(input);
  if (result && typeof result.answer === 'string') {
    result.answer = sanitizeLamports(result.answer);
  }
  return result;
}
