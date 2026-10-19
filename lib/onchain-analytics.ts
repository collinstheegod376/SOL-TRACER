/**
 * Solana On-Chain Analytics Engine
 * Implements the exact balance delta algorithm and counterparty ranking defined in workflow 4.txt:
 * - Detects incoming transfers via post_balance(wallet) > pre_balance(wallet)
 * - Identifies sender as fee payer or debit account whose balance decreased
 * - Detects outgoing transfers via post_balance(wallet) < pre_balance(wallet)
 * - Identifies receiver as credit account whose balance increased
 * - Groups by counterparty address, aggregates counts, sums SOL, calculates averages, and ranks
 * - Applies entity labeling from lib/labels.ts
 * - Generates clean typed structures for charts and tables
 */

import { labelAddress, shortenAddress, EntityCategory } from './labels';

export interface SolFlow {
  counterparty: string;
  delta: number;
  signature: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  walletAddress: string;
  label: string;
  category: EntityCategory;
  feePayer?: string;
  slot?: number;
}

export interface RankedCounterparty {
  address: string;
  label: string;
  category: EntityCategory;
  count: number;
  totalSol: number;
  avgSol: number;
  percentage: number;
  signatures: string[];
  firstSeen: number;
  lastSeen: number;
}

export interface CounterpartyChartItem {
  name: string;
  address: string;
  label: string;
  category: EntityCategory;
  value: number;
  totalSol: number;
  count: number;
  percentage: number;
}

export interface CounterpartyTableItem {
  address: string;
  label: string;
  category: 'DEX' | 'CEX' | 'System' | 'Token' | 'Whale' | 'Unlabeled';
  frequency: number;
  totalSol: number;
  avgSol: number;
  percentage: number;
}

export interface AggregationSummary {
  scannedTransactions: number;
  totalFlows: number;
  totalVolumeSol: number;
  uniqueCounterparties: number;
  sortBy: 'count' | 'total';
}

export interface GroupedCounterpartiesResult extends Array<RankedCounterparty> {
  summary: AggregationSummary;
  counterparties: RankedCounterparty[];
  chartData: CounterpartyChartItem[];
  tableData: CounterpartyTableItem[];
  markdownTable: string;
}

interface AccountBalanceEntry {
  address: string;
  preBalance: number;
  postBalance: number;
}

/**
 * Helper to normalize lamports to SOL if numbers are represented in lamports
 */
export function normalizeSol(val: number, forceLamports = false): number {
  if (val === 0 || !Number.isFinite(val)) return 0;
  if (forceLamports || (Number.isInteger(val) && Math.abs(val) >= 1_000_000)) {
    return val / 1e9;
  }
  return val;
}

/**
 * Robust balance extractor supporting Solana RPC and Solscan payloads
 */
function extractAccountBalances(tx: any): AccountBalanceEntry[] {
  if (!tx || typeof tx !== 'object') return [];

  // Format A: balance_entries array [{ account: "...", pre_balance: 1000, post_balance: 2000 }]
  if (Array.isArray(tx.balance_entries) && tx.balance_entries.length > 0) {
    const isLamports = tx.balance_entries.some(
      (b: any) => Math.abs(b.pre_balance ?? b.preBalance ?? 0) >= 1_000_000
    );
    return tx.balance_entries.map((b: any) => ({
      address: b.account || b.address || b.pubkey || '',
      preBalance: normalizeSol(b.pre_balance ?? b.preBalance ?? 0, isLamports),
      postBalance: normalizeSol(b.post_balance ?? b.postBalance ?? 0, isLamports),
    }));
  }

  // Format B: sol_bal_change (Solscan API format)
  if (Array.isArray(tx.sol_bal_change) && tx.sol_bal_change.length > 0) {
    const isLamports = tx.sol_bal_change.some(
      (b: any) => Math.abs(b.pre_balance ?? 0) >= 1_000_000
    );
    return tx.sol_bal_change.map((b: any) => ({
      address: b.address || b.account || '',
      preBalance: normalizeSol(b.pre_balance ?? 0, isLamports),
      postBalance: normalizeSol(b.post_balance ?? 0, isLamports),
    }));
  }

  // Format C: accounts array
  if (Array.isArray(tx.accounts) && tx.accounts.length > 0) {
    const isLamports = tx.accounts.some(
      (b: any) => Math.abs(b.pre_balance ?? b.preBalance ?? 0) >= 1_000_000
    );
    return tx.accounts.map((b: any) => ({
      address: b.address || b.account || b.pubkey || '',
      preBalance: normalizeSol(b.pre_balance ?? b.preBalance ?? 0, isLamports),
      postBalance: normalizeSol(b.post_balance ?? b.postBalance ?? 0, isLamports),
    }));
  }

  // Format D: Solana RPC standard parsed tx (meta.preBalances & transaction.message.accountKeys)
  if (
    tx.meta?.preBalances &&
    tx.meta?.postBalances &&
    tx.transaction?.message?.accountKeys
  ) {
    const keys: string[] = tx.transaction.message.accountKeys.map((k: any) =>
      typeof k === 'string' ? k : k.pubkey
    );
    const pre = tx.meta.preBalances;
    const post = tx.meta.postBalances;
    const len = Math.min(keys.length, pre.length, post.length);
    const entries: AccountBalanceEntry[] = [];
    for (let i = 0; i < len; i++) {
      entries.push({
        address: keys[i],
        preBalance: normalizeSol(pre[i], true), // RPC preBalances are always lamports
        postBalance: normalizeSol(post[i], true),
      });
    }
    return entries;
  }

  // Format E: Flat Solana/Solscan record with account_keys + pre_balances + post_balances
  if (
    Array.isArray(tx.account_keys) &&
    Array.isArray(tx.pre_balances) &&
    Array.isArray(tx.post_balances)
  ) {
    const isLamports = tx.pre_balances.some((b: any) => Math.abs(b ?? 0) >= 1_000_000);
    const len = Math.min(
      tx.account_keys.length,
      tx.pre_balances.length,
      tx.post_balances.length
    );
    const entries: AccountBalanceEntry[] = [];
    for (let i = 0; i < len; i++) {
      entries.push({
        address: tx.account_keys[i],
        preBalance: normalizeSol(tx.pre_balances[i], isLamports),
        postBalance: normalizeSol(tx.post_balances[i], isLamports),
      });
    }
    return entries;
  }

  // Format F: Flattened single record
  if (
    (tx.account || tx.wallet || tx.address) &&
    (tx.pre_balance !== undefined || tx.preBalance !== undefined) &&
    (tx.post_balance !== undefined || tx.postBalance !== undefined)
  ) {
    const rawPre = tx.pre_balance ?? tx.preBalance ?? 0;
    const rawPost = tx.post_balance ?? tx.postBalance ?? 0;
    const isLamports = Math.abs(rawPre) >= 1_000_000 || Math.abs(rawPost) >= 1_000_000;
    return [
      {
        address: tx.account || tx.wallet || tx.address,
        preBalance: normalizeSol(rawPre, isLamports),
        postBalance: normalizeSol(rawPost, isLamports),
      },
    ];
  }

  return [];
}

/**
 * Extract fee payer public key from a transaction object
 */
function extractFeePayer(tx: any): string | undefined {
  if (!tx || typeof tx !== 'object') return undefined;
  if (typeof tx.fee_payer === 'string' && tx.fee_payer) return tx.fee_payer;
  if (typeof tx.feePayer === 'string' && tx.feePayer) return tx.feePayer;
  if (Array.isArray(tx.signer) && tx.signer.length > 0 && typeof tx.signer[0] === 'string') {
    return tx.signer[0];
  }
  if (tx.transaction?.message?.accountKeys?.length > 0) {
    const first = tx.transaction.message.accountKeys[0];
    return typeof first === 'string' ? first : first.pubkey;
  }
  if (Array.isArray(tx.account_keys) && tx.account_keys.length > 0) {
    return tx.account_keys[0];
  }
  return undefined;
}

/**
 * Extract transaction signature string
 */
function extractSignature(tx: any, fallbackIndex = 0): string {
  if (!tx) return `tx_unknown_${fallbackIndex}`;
  if (typeof tx.signature === 'string' && tx.signature) return tx.signature;
  if (typeof tx.tx_hash === 'string' && tx.tx_hash) return tx.tx_hash;
  if (typeof tx.txHash === 'string' && tx.txHash) return tx.txHash;
  if (Array.isArray(tx.transaction?.signatures) && tx.transaction.signatures[0]) {
    return tx.transaction.signatures[0];
  }
  return `tx_${Date.now()}_${fallbackIndex}`;
}

/**
 * Extract transaction block timestamp in seconds
 */
function extractTimestamp(tx: any): number {
  if (!tx) return Math.floor(Date.now() / 1000);
  const time = tx.block_time ?? tx.blockTime ?? tx.time ?? tx.timestamp;
  if (typeof time === 'number' && time > 0) {
    // If milliseconds timestamp (> 1e11), convert to seconds
    return time > 1e11 ? Math.floor(time / 1000) : Math.floor(time);
  }
  return Math.floor(Date.now() / 1000);
}

/**
 * Filter for incoming SOL transfers to the target wallet.
 * Algorithm defined in workflow 4.txt:
 * 1. For each transaction, find the entry where account == WALLET
 * 2. If post_balance > pre_balance:
 *    - delta = post_balance - pre_balance
 *    - sender = the fee payer or the account whose balance decreased
 * 3. Else skip
 */
export function filterIncomingSol(
  param1: string | any[],
  param2: string | any[]
): SolFlow[] {
  // Support flexible argument order: (walletAddress, transactions) or (transactions, walletAddress)
  let walletAddress: string;
  let transactions: any[];

  if (typeof param1 === 'string' && Array.isArray(param2)) {
    walletAddress = param1;
    transactions = param2;
  } else if (Array.isArray(param1) && typeof param2 === 'string') {
    transactions = param1;
    walletAddress = param2;
  } else {
    walletAddress = typeof param1 === 'string' ? param1 : '';
    transactions = Array.isArray(param2) ? param2 : [];
  }

  const incomingFlows: SolFlow[] = [];
  const normalizedTarget = walletAddress.trim().toLowerCase();

  if (!normalizedTarget || transactions.length === 0) {
    return incomingFlows;
  }

  for (let idx = 0; idx < transactions.length; idx++) {
    const tx = transactions[idx];
    const balances = extractAccountBalances(tx);
    if (balances.length === 0) continue;

    const targetEntry = balances.find(
      (b) => b.address.toLowerCase() === normalizedTarget
    );

    // Context check: post_balance(wallet) > pre_balance(wallet)
    if (!targetEntry || targetEntry.postBalance <= targetEntry.preBalance) {
      continue;
    }

    const delta = Number((targetEntry.postBalance - targetEntry.preBalance).toFixed(9));
    const feePayer = extractFeePayer(tx);

    // Identify sender: look for debited accounts (balance decreased)
    const debitedAccounts = balances.filter(
      (b) =>
        b.address.toLowerCase() !== normalizedTarget &&
        b.postBalance < b.preBalance
    );

    let sender = '';

    if (debitedAccounts.length > 0) {
      // Find account whose decrease best matches the delta or had the largest decrease
      debitedAccounts.sort((a, b) => {
        const decA = a.preBalance - a.postBalance;
        const decB = b.preBalance - b.postBalance;
        // Prioritize match closest to incoming delta
        const diffA = Math.abs(decA - delta);
        const diffB = Math.abs(decB - delta);
        return diffA - diffB || decB - decA;
      });
      sender = debitedAccounts[0].address;
    }

    // If no debited account found, fall back to fee payer (if not target wallet)
    if (!sender && feePayer && feePayer.toLowerCase() !== normalizedTarget) {
      sender = feePayer;
    }

    // If sender still empty, check if fee payer was target wallet or fallback to unknown
    if (!sender) {
      sender = feePayer || 'Unknown Sender';
    }

    const signature = extractSignature(tx, idx);
    const timestamp = extractTimestamp(tx);
    const entity = labelAddress(sender);

    incomingFlows.push({
      counterparty: sender,
      delta,
      signature,
      timestamp,
      direction: 'incoming',
      walletAddress,
      label: entity.label,
      category: entity.category,
      feePayer,
      slot: tx.slot,
    });
  }

  return incomingFlows;
}

/**
 * Filter for outgoing SOL transfers from the target wallet.
 * Finds transactions where post_balance < pre_balance for the target wallet.
 * Identifies the recipient as the account whose balance increased.
 */
export function filterOutgoingSol(
  param1: string | any[],
  param2: string | any[]
): SolFlow[] {
  let walletAddress: string;
  let transactions: any[];

  if (typeof param1 === 'string' && Array.isArray(param2)) {
    walletAddress = param1;
    transactions = param2;
  } else if (Array.isArray(param1) && typeof param2 === 'string') {
    transactions = param1;
    walletAddress = param2;
  } else {
    walletAddress = typeof param1 === 'string' ? param1 : '';
    transactions = Array.isArray(param2) ? param2 : [];
  }

  const outgoingFlows: SolFlow[] = [];
  const normalizedTarget = walletAddress.trim().toLowerCase();

  if (!normalizedTarget || transactions.length === 0) {
    return outgoingFlows;
  }

  for (let idx = 0; idx < transactions.length; idx++) {
    const tx = transactions[idx];
    const balances = extractAccountBalances(tx);
    if (balances.length === 0) continue;

    const targetEntry = balances.find(
      (b) => b.address.toLowerCase() === normalizedTarget
    );

    // Context check: post_balance(wallet) < pre_balance(wallet)
    if (!targetEntry || targetEntry.postBalance >= targetEntry.preBalance) {
      continue;
    }

    const delta = Number((targetEntry.preBalance - targetEntry.postBalance).toFixed(9));
    const feePayer = extractFeePayer(tx);

    // Identify recipient: look for credited accounts (balance increased)
    const creditedAccounts = balances.filter(
      (b) =>
        b.address.toLowerCase() !== normalizedTarget &&
        b.postBalance > b.preBalance
    );

    let receiver = '';

    if (creditedAccounts.length > 0) {
      // Find account with the largest balance increase
      creditedAccounts.sort((a, b) => {
        const incA = a.postBalance - a.preBalance;
        const incB = b.postBalance - b.preBalance;
        const diffA = Math.abs(incA - delta);
        const diffB = Math.abs(incB - delta);
        return diffA - diffB || incB - incA;
      });
      receiver = creditedAccounts[0].address;
    }

    // Fallback: if no credited account, check second account key (standard Solana recipient position)
    if (!receiver && balances.length > 1) {
      const other = balances.find((b) => b.address.toLowerCase() !== normalizedTarget);
      if (other) receiver = other.address;
    }

    if (!receiver) {
      receiver = 'Unknown Recipient';
    }

    const signature = extractSignature(tx, idx);
    const timestamp = extractTimestamp(tx);
    const entity = labelAddress(receiver);

    outgoingFlows.push({
      counterparty: receiver,
      delta,
      signature,
      timestamp,
      direction: 'outgoing',
      walletAddress,
      label: entity.label,
      category: entity.category,
      feePayer,
      slot: tx.slot,
    });
  }

  return outgoingFlows;
}

/**
 * Group counterparties by address, count transactions, sum total SOL, calculate average,
 * sort descending, apply entity labels, and return clean typed structures for tables and charts.
 *
 * Implements workflow 4 STEP 4 & STEP 5.
 */
export function groupAndRankCounterparties(
  flows: Array<{ counterparty: string; delta: number; signature: string; timestamp: number }>,
  sortBy: 'count' | 'total' = 'count'
): GroupedCounterpartiesResult {
  const map = new Map<
    string,
    {
      totalSol: number;
      count: number;
      signatures: string[];
      firstSeen: number;
      lastSeen: number;
    }
  >();

  let totalVolumeSol = 0;

  for (const flow of flows) {
    const address = flow.counterparty || 'Unknown';
    const amount = Number(flow.delta) || 0;
    totalVolumeSol += amount;

    const existing = map.get(address) || {
      totalSol: 0,
      count: 0,
      signatures: [],
      firstSeen: flow.timestamp || Math.floor(Date.now() / 1000),
      lastSeen: flow.timestamp || Math.floor(Date.now() / 1000),
    };

    existing.totalSol += amount;
    existing.count += 1;
    if (flow.signature && !existing.signatures.includes(flow.signature)) {
      existing.signatures.push(flow.signature);
    }
    if (flow.timestamp) {
      if (flow.timestamp < existing.firstSeen) existing.firstSeen = flow.timestamp;
      if (flow.timestamp > existing.lastSeen) existing.lastSeen = flow.timestamp;
    }

    map.set(address, existing);
  }

  totalVolumeSol = Number(totalVolumeSol.toFixed(6));

  const ranked: RankedCounterparty[] = Array.from(map.entries()).map(([address, stats]) => {
    const total = Number(stats.totalSol.toFixed(6));
    const avg = stats.count > 0 ? Number((total / stats.count).toFixed(6)) : 0;
    const percentage = totalVolumeSol > 0 ? Number(((total / totalVolumeSol) * 100).toFixed(2)) : 0;
    const entity = labelAddress(address);

    return {
      address,
      label: entity.label,
      category: entity.category,
      count: stats.count,
      totalSol: total,
      avgSol: avg,
      percentage,
      signatures: stats.signatures,
      firstSeen: stats.firstSeen,
      lastSeen: stats.lastSeen,
    };
  });

  // Sort descending by count or total
  ranked.sort((a, b) => {
    if (sortBy === 'total') {
      return b.totalSol - a.totalSol || b.count - a.count;
    }
    return b.count - a.count || b.totalSol - a.totalSol;
  });

  // Chart structured data
  const chartData: CounterpartyChartItem[] = ranked.map((item) => ({
    name: item.label !== 'unlabeled' ? item.label : shortenAddress(item.address, 4),
    address: item.address,
    label: item.label,
    category: item.category,
    value: sortBy === 'total' ? item.totalSol : item.count,
    totalSol: item.totalSol,
    count: item.count,
    percentage: item.percentage,
  }));

  // UI Table structured data
  const tableData: CounterpartyTableItem[] = ranked.map((item) => {
    let uiCategory: 'DEX' | 'CEX' | 'System' | 'Token' | 'Whale' | 'Unlabeled';
    switch (item.category) {
      case 'dex':
        uiCategory = 'DEX';
        break;
      case 'cex':
        uiCategory = 'CEX';
        break;
      case 'system':
        uiCategory = 'System';
        break;
      case 'token':
        uiCategory = 'Token';
        break;
      case 'user':
      default:
        uiCategory = item.totalSol > 500 ? 'Whale' : 'Unlabeled';
        break;
    }

    return {
      address: item.address,
      label: item.label,
      category: uiCategory,
      frequency: item.count,
      totalSol: item.totalSol,
      avgSol: item.avgSol,
      percentage: item.percentage,
    };
  });

  // Markdown table per workflow 4 STEP 6
  let markdownTable = '| Counterparty | Times | Total SOL | Avg SOL | Category |\n';
  markdownTable += '|:-------------|:------|:----------|:--------|:---------|\n';

  for (const item of ranked) {
    const displayAddr =
      item.label !== 'unlabeled'
        ? `${shortenAddress(item.address)} (${item.label})`
        : shortenAddress(item.address);
    markdownTable += `| \`${displayAddr}\` | ${item.count} | ${item.totalSol.toFixed(4)} SOL | ${item.avgSol.toFixed(4)} SOL | ${item.category.toUpperCase()} |\n`;
  }

  const summary: AggregationSummary = {
    scannedTransactions: flows.length,
    totalFlows: flows.length,
    totalVolumeSol,
    uniqueCounterparties: ranked.length,
    sortBy,
  };

  // Construct return object that behaves as both an Array of RankedCounterparty and contains helper fields
  const result = Object.assign([...ranked], {
    summary,
    counterparties: ranked,
    chartData,
    tableData,
    markdownTable,
  }) as GroupedCounterpartiesResult;

  return result;
}
