export interface TransferEvent {
  signature: string;
  timestamp: number;
  sender: string;
  receiver: string;
  amountSol: number;
  label?: string;
}

export interface CounterpartySummary {
  address: string;
  count: number;
  totalSol: number;
  avgSol: number;
  latestTimestamp: number;
  label: string;
}

export interface PortfolioValuation {
  solBalance: number;
  solPriceUsd: number;
  solUsdValue: number;
  tokensUsdValue: number;
  totalUsdValue: number;
  isWhale: boolean;
  whaleThresholdUsd: number;
  topHoldings: Array<{
    symbol: string;
    name?: string;
    uiAmount: number;
    priceUsd: number;
    usdValue: number;
  }>;
}

export const KNOWN_LABELS: Record<string, string> = {
  '11111111111111111111111111111111': 'System Program (Transfer)',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program',
  'ComputeBudget111111111111111111111111111111': 'Compute Budget',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter (DEX)',
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': 'Jupiter v4 (DEX)',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool (DEX)',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium Liquidity Pool V4 (DEX)',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM (DEX)',
  'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS': 'Raydium Router (DEX)',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora DLMM (DEX)',
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB': 'Meteora Pools (DEX)',
  '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9': 'Binance (Exchange)',
  '2AQdpHJ2JpcEgPiATUXjQxA8QmaNakedHwgU7JwfZg1Fe': 'Coinbase (Exchange)',
  'FWznbcNXWQuHTawe9RxvQ2LdJF243sZ62c64r21oKkBH': 'Kraken (Exchange)',
  'AC5RDfQFmDS1deWZos921qbhirGLTgRyrYZdmZ9XRDCQ': 'Bybit (Exchange)',
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': 'OKX (Exchange)',
};

/**
 * Return human-readable label for a Solana address
 */
export function labelAddress(address: string): string {
  if (!address) return 'Unlabeled';
  if (KNOWN_LABELS[address]) {
    return KNOWN_LABELS[address];
  }
  if (address.startsWith('JUP')) return 'Jupiter (DEX)';
  if (address.startsWith('ray') || address.startsWith('Ray')) return 'Raydium (DEX)';
  if (address.startsWith('whirL')) return 'Orca (DEX)';
  if (address.startsWith('meta') || address.startsWith('LBUZ')) return 'Meteora (DEX)';
  return 'Unlabeled';
}

export function formatAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address || '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Filter transactions where the target wallet received SOL
 * Signal per context.txt: post_balance(wallet) > pre_balance(wallet)
 */
export function filterIncomingSol(
  transactions: any[],
  targetWallet: string
): TransferEvent[] {
  const incoming: TransferEvent[] = [];
  const walletLower = targetWallet.toLowerCase();

  for (const tx of transactions) {
    // If transaction already has parsed direction & amount from mock/enrichment
    if (tx.direction === 'incoming' && tx.amount && tx.counterparty) {
      incoming.push({
        signature: tx.signature,
        timestamp: tx.block_time || Date.now() / 1000,
        sender: tx.counterparty,
        receiver: targetWallet,
        amountSol: tx.amount,
        label: tx.counterparty_label || labelAddress(tx.counterparty),
      });
      continue;
    }

    let preLamports = 0;
    let postLamports = 0;
    let found = false;

    // Structure 1: pre_balances: [{ account, lamports }]
    if (Array.isArray(tx.pre_balances) && tx.pre_balances.length > 0 && typeof tx.pre_balances[0] === 'object') {
      const preObj = tx.pre_balances.find((b: any) => b.account?.toLowerCase() === walletLower);
      const postObj = tx.post_balances?.find((b: any) => b.account?.toLowerCase() === walletLower);
      if (preObj && postObj) {
        preLamports = preObj.lamports;
        postLamports = postObj.lamports;
        found = true;
      }
    }
    // Structure 2: balance_entries: [{ account, pre_balance, post_balance }]
    else if (Array.isArray(tx.balance_entries)) {
      const entry = tx.balance_entries.find((b: any) => b.account?.toLowerCase() === walletLower);
      if (entry) {
        preLamports = entry.pre_balance;
        postLamports = entry.post_balance;
        found = true;
      }
    }
    // Structure 3: account_keys with numeric pre/post_balances
    else if (
      Array.isArray(tx.account_keys) &&
      Array.isArray(tx.pre_balances) &&
      Array.isArray(tx.post_balances)
    ) {
      const idx = tx.account_keys.findIndex((k: string) => k.toLowerCase() === walletLower);
      if (idx !== -1) {
        preLamports = tx.pre_balances[idx];
        postLamports = tx.post_balances[idx];
        found = true;
      }
    }

    if (found && postLamports > preLamports) {
      const deltaSol = typeof tx.amount === 'number' && tx.amount > 0
        ? tx.amount
        : Number(((postLamports - preLamports) / (postLamports > 1_000_000 ? 1e9 : 1)).toFixed(6));
      let sender = tx.counterparty || tx.fee_payer;

      // Extract from balance changes if sender is still active wallet or missing
      if (!sender || sender.toLowerCase() === walletLower) {
        if (Array.isArray(tx.post_balances) && typeof tx.post_balances[0] === 'object') {
          const dec = tx.post_balances.find((b: any) => {
            const pre = tx.pre_balances.find((p: any) => p.account === b.account);
            return b.account.toLowerCase() !== walletLower && pre && b.lamports < pre.lamports;
          });
          if (dec) sender = dec.account;
        }
      }

      if (!sender || sender.toLowerCase() === walletLower) {
        sender = 'Unknown Sender';
      }

      incoming.push({
        signature: tx.signature,
        timestamp: tx.block_time || Date.now() / 1000,
        sender,
        receiver: targetWallet,
        amountSol: deltaSol,
        label: tx.counterparty_label || labelAddress(sender),
      });
    }
  }

  return incoming;
}

/**
 * Filter transactions where the target wallet sent SOL
 * Signal: post_balance(wallet) < pre_balance(wallet)
 */
export function filterOutgoingSol(
  transactions: any[],
  targetWallet: string
): TransferEvent[] {
  const outgoing: TransferEvent[] = [];
  const walletLower = targetWallet.toLowerCase();

  for (const tx of transactions) {
    if (tx.direction === 'outgoing' && tx.amount && tx.counterparty) {
      outgoing.push({
        signature: tx.signature,
        timestamp: tx.block_time || Date.now() / 1000,
        sender: targetWallet,
        receiver: tx.counterparty,
        amountSol: tx.amount,
        label: tx.counterparty_label || labelAddress(tx.counterparty),
      });
      continue;
    }

    let preLamports = 0;
    let postLamports = 0;
    let found = false;

    if (Array.isArray(tx.pre_balances) && tx.pre_balances.length > 0 && typeof tx.pre_balances[0] === 'object') {
      const preObj = tx.pre_balances.find((b: any) => b.account?.toLowerCase() === walletLower);
      const postObj = tx.post_balances?.find((b: any) => b.account?.toLowerCase() === walletLower);
      if (preObj && postObj) {
        preLamports = preObj.lamports;
        postLamports = postObj.lamports;
        found = true;
      }
    } else if (Array.isArray(tx.balance_entries)) {
      const entry = tx.balance_entries.find((b: any) => b.account?.toLowerCase() === walletLower);
      if (entry) {
        preLamports = entry.pre_balance;
        postLamports = entry.post_balance;
        found = true;
      }
    } else if (
      Array.isArray(tx.account_keys) &&
      Array.isArray(tx.pre_balances) &&
      Array.isArray(tx.post_balances)
    ) {
      const idx = tx.account_keys.findIndex((k: string) => k.toLowerCase() === walletLower);
      if (idx !== -1) {
        preLamports = tx.pre_balances[idx];
        postLamports = tx.post_balances[idx];
        found = true;
      }
    }

    if (found && postLamports < preLamports) {
      const deltaSol = typeof tx.amount === 'number' && tx.amount > 0
        ? tx.amount
        : Number(((preLamports - postLamports) / (preLamports > 1_000_000 ? 1e9 : 1)).toFixed(6));
      let receiver = tx.counterparty;

      if (!receiver || receiver.toLowerCase() === walletLower) {
        if (Array.isArray(tx.post_balances) && typeof tx.post_balances[0] === 'object') {
          const inc = tx.post_balances.find((b: any) => {
            const pre = tx.pre_balances.find((p: any) => p.account === b.account);
            return b.account.toLowerCase() !== walletLower && pre && b.lamports > pre.lamports;
          });
          if (inc) receiver = inc.account;
        }
      }

      if (!receiver || receiver.toLowerCase() === walletLower) {
        receiver = 'Unknown Recipient';
      }

      outgoing.push({
        signature: tx.signature,
        timestamp: tx.block_time || Date.now() / 1000,
        sender: targetWallet,
        receiver,
        amountSol: deltaSol,
        label: tx.counterparty_label || labelAddress(receiver),
      });
    }
  }

  return outgoing;
}

/**
 * Group and rank counterparties by frequency (count) or volume (total SOL)
 */
export function groupAndRankCounterparties(
  transfers: TransferEvent[],
  targetWallet?: string,
  sortBy: 'count' | 'total' = 'count'
): CounterpartySummary[] {
  const map = new Map<string, { count: number; totalSol: number; latestTimestamp: number }>();
  const walletLower = targetWallet ? targetWallet.toLowerCase() : '';

  for (const t of transfers) {
    let counterparty = '';
    const senderLower = (t.sender || '').toLowerCase();
    const receiverLower = (t.receiver || '').toLowerCase();

    if (walletLower) {
      if (senderLower === walletLower) {
        counterparty = t.receiver;
      } else if (receiverLower === walletLower) {
        counterparty = t.sender;
      } else {
        counterparty = t.sender !== 'Unknown Sender' ? t.sender : t.receiver;
      }
    } else {
      counterparty = t.sender !== 'Unknown Sender' ? t.sender : t.receiver;
    }

    if (!counterparty || counterparty.toLowerCase() === walletLower) {
      continue;
    }

    const existing = map.get(counterparty) || { count: 0, totalSol: 0, latestTimestamp: 0 };
    existing.count += 1;
    existing.totalSol += t.amountSol;
    if (t.timestamp > existing.latestTimestamp) {
      existing.latestTimestamp = t.timestamp;
    }
    map.set(counterparty, existing);
  }

  const results: CounterpartySummary[] = Array.from(map.entries()).map(([address, stats]) => ({
    address,
    count: stats.count,
    totalSol: Number(stats.totalSol.toFixed(4)),
    avgSol: Number((stats.totalSol / stats.count).toFixed(4)),
    latestTimestamp: stats.latestTimestamp,
    label: labelAddress(address),
  }));

  results.sort((a, b) => {
    if (sortBy === 'total') {
      return b.totalSol - a.totalSol || b.count - a.count;
    }
    return b.count - a.count || b.totalSol - a.totalSol;
  });

  return results;
}

/**
 * Format markdown table of counterparties per workflow 4
 */
export function formatCounterpartyTable(
  ranked: CounterpartySummary[],
  direction: 'incoming' | 'outgoing' = 'incoming',
  limit = 10
): string {
  const slice = ranked.slice(0, limit);
  if (slice.length === 0) {
    return `*No ${direction} counterparties detected in the scanned transaction window.*`;
  }

  const role = direction === 'incoming' ? 'Sender' : 'Recipient';
  let md = `| ${role} | Times | Total SOL | Avg SOL | Label |\n`;
  md += `| :--- | :---: | :---: | :---: | :--- |\n`;

  for (const item of slice) {
    const shortAddr = formatAddress(item.address, 4);
    const labelBadge = item.label !== 'Unlabeled' ? `\`${item.label}\`` : 'Unlabeled';
    const addressLink = `[${shortAddr}](https://solscan.io/account/${item.address})`;
    md += `| ${addressLink} | ${item.count} | ${item.totalSol.toFixed(4)} SOL | ${item.avgSol.toFixed(4)} SOL | ${labelBadge} |\n`;
  }

  return md;
}

/**
 * Compute USD portfolio valuation by joining account balance + tokens + prices
 */
export function calculatePortfolioValuation(
  accountDetail: any,
  tokenAccounts: any[],
  solPriceUsd = 150.0
): PortfolioValuation {
  const solBalance = accountDetail?.sol_balance ?? (accountDetail?.lamports ? accountDetail.lamports / 1e9 : 0);
  const solUsdValue = solBalance * solPriceUsd;

  let tokensUsdValue = 0;
  const topHoldings: Array<{
    symbol: string;
    name?: string;
    uiAmount: number;
    priceUsd: number;
    usdValue: number;
  }> = [];

  for (const token of tokenAccounts || []) {
    const price = token.price_usd || 0;
    const uiAmount = token.amount ?? token.ui_amount ?? 0;
    const value = token.value_usd ?? token.usd_value ?? (uiAmount * price);
    tokensUsdValue += value;

    topHoldings.push({
      symbol: token.token_symbol || token.symbol || 'SPL',
      name: token.token_name || token.name,
      uiAmount,
      priceUsd: price,
      usdValue: Number(value.toFixed(2)),
    });
  }

  topHoldings.sort((a, b) => b.usdValue - a.usdValue);

  const totalUsdValue = solUsdValue + tokensUsdValue;
  const WHALE_THRESHOLD_USD = 1_000_000;
  const isWhale = Boolean(accountDetail?.is_whale) || totalUsdValue >= WHALE_THRESHOLD_USD || solBalance >= 5_000;

  return {
    solBalance: Number(solBalance.toFixed(4)),
    solPriceUsd,
    solUsdValue: Number(solUsdValue.toFixed(2)),
    tokensUsdValue: Number(tokensUsdValue.toFixed(2)),
    totalUsdValue: Number(totalUsdValue.toFixed(2)),
    isWhale,
    whaleThresholdUsd: WHALE_THRESHOLD_USD,
    topHoldings: topHoldings.slice(0, 10),
  };
}

export interface TokenTransferEvent {
  signature: string;
  timestamp: number;
  sender: string;
  receiver: string;
  mint: string;
  symbol: string;
  amount: number;
  label?: string;
}

export interface TokenCounterpartySummary {
  address: string;
  symbol: string;
  mint?: string;
  count: number;
  totalAmount: number;
  avgAmount: number;
  latestTimestamp: number;
  label: string;
}

export function filterIncomingTokenTransfers(
  transactions: any[],
  targetWallet: string
): TokenTransferEvent[] {
  const incoming: TokenTransferEvent[] = [];
  const walletLower = targetWallet.toLowerCase();

  for (const tx of transactions) {
    if (Array.isArray(tx.token_transfers)) {
      for (const t of tx.token_transfers) {
        if (t.direction === 'incoming' || (t.destination_owner && t.destination_owner.toLowerCase() === walletLower)) {
          const sender = t.counterparty || t.source_owner || tx.fee_payer || 'Unknown Sender';
          incoming.push({
            signature: tx.signature,
            timestamp: tx.block_time || Date.now() / 1000,
            sender,
            receiver: targetWallet,
            mint: t.mint || '',
            symbol: t.symbol || 'SPL',
            amount: t.amount || 0,
            label: labelAddress(sender),
          });
        }
      }
    }
  }

  return incoming;
}

export function filterOutgoingTokenTransfers(
  transactions: any[],
  targetWallet: string
): TokenTransferEvent[] {
  const outgoing: TokenTransferEvent[] = [];
  const walletLower = targetWallet.toLowerCase();

  for (const tx of transactions) {
    if (Array.isArray(tx.token_transfers)) {
      for (const t of tx.token_transfers) {
        if (t.direction === 'outgoing' || (t.source_owner && t.source_owner.toLowerCase() === walletLower)) {
          const receiver = t.counterparty || t.destination_owner || 'Unknown Recipient';
          outgoing.push({
            signature: tx.signature,
            timestamp: tx.block_time || Date.now() / 1000,
            sender: targetWallet,
            receiver,
            mint: t.mint || '',
            symbol: t.symbol || 'SPL',
            amount: t.amount || 0,
            label: labelAddress(receiver),
          });
        }
      }
    }
  }

  return outgoing;
}

export function groupAndRankTokenCounterparties(
  transfers: TokenTransferEvent[],
  targetWallet?: string
): TokenCounterpartySummary[] {
  const map = new Map<string, { count: number; totalAmount: number; latestTimestamp: number; symbol: string; mint?: string }>();
  const walletLower = targetWallet ? targetWallet.toLowerCase() : '';

  for (const t of transfers) {
    let counterparty = '';
    const senderLower = (t.sender || '').toLowerCase();
    const receiverLower = (t.receiver || '').toLowerCase();

    if (walletLower) {
      if (senderLower === walletLower) {
        counterparty = t.receiver;
      } else if (receiverLower === walletLower) {
        counterparty = t.sender;
      } else {
        counterparty = t.sender !== 'Unknown Sender' ? t.sender : t.receiver;
      }
    } else {
      counterparty = t.sender !== 'Unknown Sender' ? t.sender : t.receiver;
    }

    if (!counterparty || counterparty.toLowerCase() === walletLower) continue;

    const key = `${counterparty}:${t.symbol}`;
    const existing = map.get(key) || {
      count: 0,
      totalAmount: 0,
      latestTimestamp: 0,
      symbol: t.symbol,
      mint: t.mint,
    };

    existing.count += 1;
    existing.totalAmount += t.amount;
    if (t.timestamp > existing.latestTimestamp) {
      existing.latestTimestamp = t.timestamp;
    }
    map.set(key, existing);
  }

  const results: TokenCounterpartySummary[] = Array.from(map.entries()).map(([key, stats]) => {
    const [address] = key.split(':');
    return {
      address,
      symbol: stats.symbol,
      mint: stats.mint,
      count: stats.count,
      totalAmount: Number(stats.totalAmount.toFixed(6)),
      avgAmount: Number((stats.totalAmount / stats.count).toFixed(6)),
      latestTimestamp: stats.latestTimestamp,
      label: labelAddress(address),
    };
  });

  results.sort((a, b) => b.totalAmount - a.totalAmount || b.count - a.count);
  return results;
}

export function formatTokenCounterpartyTable(
  ranked: TokenCounterpartySummary[],
  direction: 'incoming' | 'outgoing' = 'incoming',
  limit = 10
): string {
  const slice = ranked.slice(0, limit);
  if (slice.length === 0) {
    return `*No ${direction} SPL token (USDT/USDC) transfers detected in the scanned transaction window.*`;
  }

  const role = direction === 'incoming' ? 'Sender' : 'Recipient';
  let md = `| ${role} | Asset | Times | Total Amount | Avg Transfer | Label |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  for (const item of slice) {
    const shortAddr = formatAddress(item.address, 4);
    const labelBadge = item.label !== 'Unlabeled' ? `\`${item.label}\`` : 'Unlabeled';
    const addressLink = `[${shortAddr}](https://solscan.io/account/${item.address})`;
    md += `| ${addressLink} | **${item.symbol}** | ${item.count} | ${item.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${item.symbol} | ${item.avgAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${item.symbol} | ${labelBadge} |\n`;
  }

  return md;
}

/**
 * Generate a Mermaid money flow diagram representing inflows, target wallet, and outflows
 */
export function generateFlowDiagram(
  walletAddress: string,
  incomingSol: TransferEvent[] = [],
  outgoingSol: TransferEvent[] = [],
  incomingTokens: TokenTransferEvent[] = [],
  outgoingTokens: TokenTransferEvent[] = []
): string {
  const shortTarget = formatAddress(walletAddress, 4);
  let chart = '```mermaid\nflowchart LR\n';
  chart += `  classDef target fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff,font-weight:bold;\n`;
  chart += `  classDef inflow fill:#1E293B,stroke:#3B82F6,stroke-width:1.5px,color:#E2E8F0;\n`;
  chart += `  classDef outflow fill:#1E293B,stroke:#F59E0B,stroke-width:1.5px,color:#E2E8F0;\n\n`;
  chart += `  Target["🎯 Target Wallet\\n${shortTarget}"]:::target\n\n`;

  // Aggregate Inflow
  const inMap = new Map<string, { label: string; sol: number; tokens: Record<string, number> }>();
  for (const t of incomingSol) {
    if (!t.sender || t.sender === 'Unknown Sender') continue;
    const item = inMap.get(t.sender) || { label: t.label || labelAddress(t.sender), sol: 0, tokens: {} };
    item.sol += t.amountSol;
    inMap.set(t.sender, item);
  }
  for (const t of incomingTokens) {
    if (!t.sender || t.sender === 'Unknown Sender') continue;
    const item = inMap.get(t.sender) || { label: t.label || labelAddress(t.sender), sol: 0, tokens: {} };
    item.tokens[t.symbol] = (item.tokens[t.symbol] || 0) + t.amount;
    inMap.set(t.sender, item);
  }

  const topIn = Array.from(inMap.entries()).slice(0, 4);
  topIn.forEach(([addr, stats], idx) => {
    const sId = `In_${idx}`;
    const sShort = formatAddress(addr, 4);
    const tokenParts = Object.entries(stats.tokens).map(([sym, amt]) => `${amt.toFixed(2)} ${sym}`);
    if (stats.sol > 0) tokenParts.unshift(`${stats.sol.toFixed(2)} SOL`);
    const valText = tokenParts.join(', ') || 'Inbound';
    chart += `  ${sId}["📥 ${sShort}\\n${valText}"]:::inflow\n`;
    chart += `  ${sId} -->|"${valText}"| Target\n`;
  });

  // Aggregate Outflow
  const outMap = new Map<string, { label: string; sol: number; tokens: Record<string, number> }>();
  for (const t of outgoingSol) {
    if (!t.receiver || t.receiver === 'Unknown Recipient') continue;
    const item = outMap.get(t.receiver) || { label: t.label || labelAddress(t.receiver), sol: 0, tokens: {} };
    item.sol += t.amountSol;
    outMap.set(t.receiver, item);
  }
  for (const t of outgoingTokens) {
    if (!t.receiver || t.receiver === 'Unknown Recipient') continue;
    const item = outMap.get(t.receiver) || { label: t.label || labelAddress(t.receiver), sol: 0, tokens: {} };
    item.tokens[t.symbol] = (item.tokens[t.symbol] || 0) + t.amount;
    outMap.set(t.receiver, item);
  }

  const topOut = Array.from(outMap.entries()).slice(0, 4);
  topOut.forEach(([addr, stats], idx) => {
    const oId = `Out_${idx}`;
    const oShort = formatAddress(addr, 4);
    const tokenParts = Object.entries(stats.tokens).map(([sym, amt]) => `${amt.toFixed(2)} ${sym}`);
    if (stats.sol > 0) tokenParts.unshift(`${stats.sol.toFixed(2)} SOL`);
    const valText = tokenParts.join(', ') || 'Outbound';
    chart += `  ${oId}["📤 ${oShort}\\n${valText}"]:::outflow\n`;
    chart += `  Target -->|"${valText}"| ${oId}\n`;
  });

  chart += '```\n';
  return chart;
}

export interface DexSwapEvent {
  signature: string;
  blockTime: number;
  dex: string;
  inToken: string;
  inAmount: number;
  outToken: string;
  outAmount: number;
  type: 'BUY' | 'SELL' | 'SWAP';
  status: string;
}

/**
 * Decode decentralized exchange (DEX) swaps from transaction records
 */
export function parseDexSwaps(transactions: any[], walletAddress: string): DexSwapEvent[] {
  const swaps: DexSwapEvent[] = [];
  const walletLower = walletAddress.toLowerCase();

  for (const tx of transactions) {
    const accountKeys = tx.account_keys || [];
    let detectedDex = '';

    for (const k of accountKeys) {
      const pubkey = typeof k === 'string' ? k : k.pubkey;
      if (pubkey === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' || pubkey === 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK') {
        detectedDex = 'Raydium';
        break;
      } else if (pubkey === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' || pubkey === 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB') {
        detectedDex = 'Jupiter';
        break;
      } else if (pubkey === 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc') {
        detectedDex = 'Orca';
        break;
      } else if (pubkey === 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo') {
        detectedDex = 'Meteora';
        break;
      } else if (pubkey === '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P') {
        detectedDex = 'Pump.fun';
        break;
      }
    }

    if (!detectedDex && !tx.is_swap) continue;
    detectedDex = detectedDex || 'Solana DEX';

    // Decode token changes
    const tokenTransfers = tx.token_transfers || [];
    let inToken = 'SOL';
    let inAmount = 0;
    let outToken = 'SPL';
    let outAmount = 0;

    const outTokens = tokenTransfers.filter((t: any) => t.direction === 'outgoing');
    const inTokens = tokenTransfers.filter((t: any) => t.direction === 'incoming');

    if (outTokens.length > 0 && inTokens.length > 0) {
      inToken = outTokens[0].symbol;
      inAmount = outTokens[0].amount;
      outToken = inTokens[0].symbol;
      outAmount = inTokens[0].amount;
    } else if (tokenTransfers.length > 0) {
      const t = tokenTransfers[0];
      if (t.direction === 'incoming') {
        inToken = 'SOL';
        inAmount = 0.5;
        outToken = t.symbol;
        outAmount = t.amount;
      } else {
        inToken = t.symbol;
        inAmount = t.amount;
        outToken = 'SOL';
        outAmount = 0.5;
      }
    }

    const type = inToken === 'SOL' || inToken === 'USDC' || inToken === 'USDT' ? 'BUY' : 'SELL';

    swaps.push({
      signature: tx.signature,
      blockTime: tx.block_time || Math.floor(Date.now() / 1000),
      dex: detectedDex,
      inToken,
      inAmount: Number(inAmount.toFixed(4)),
      outToken,
      outAmount: Number(outAmount.toFixed(4)),
      type,
      status: tx.status || 'Success',
    });
  }

  return swaps;
}

export function formatDexSwapTable(swaps: DexSwapEvent[], limit = 6): string {
  if (swaps.length === 0) {
    return `*No direct DEX swap interactions (Raydium, Jupiter, Orca, Meteora) were detected in the recent transaction window.*`;
  }

  let md = `| Transaction Proof | DEX | Action | Paid / Sold | Received / Bought | Status |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const s of swaps.slice(0, limit)) {
    const shortSig = formatAddress(s.signature, 4);
    const proofLink = `[tx: ${shortSig}](https://solscan.io/tx/${s.signature})`;
    const actionBadge = s.type === 'BUY' ? '🟢 `BUY`' : '🔴 `SELL`';
    md += `| ${proofLink} | **${s.dex}** | ${actionBadge} | ${s.inAmount} ${s.inToken} | ${s.outAmount} ${s.outToken} | \`${s.status}\` |\n`;
  }

  return md;
}

export interface SecurityAuditResult {
  score: number; // 0 - 100
  rating: 'Clean' | 'Low Risk' | 'Moderate Risk' | 'Critical Risk';
  summary: string;
  checks: Array<{
    category: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    detail: string;
  }>;
  flaggedTokens: string[];
  unlimitedApprovals: number;
}

/**
 * Conduct comprehensive wallet security and drainer threat audit
 */
export function auditWalletSecurity(
  accountDetail: any,
  tokenAccounts: any[] = [],
  transactions: any[] = []
): SecurityAuditResult {
  const checks: Array<{ category: string; status: 'PASS' | 'WARN' | 'FAIL'; detail: string }> = [];
  let score = 100;
  const flaggedTokens: string[] = [];
  let unlimitedApprovals = 0;

  // 1. Account Owner & Executable Check
  const ownerProgram = accountDetail?.owner_program || '11111111111111111111111111111111';
  if (ownerProgram === '11111111111111111111111111111111') {
    checks.push({
      category: 'Program Authority',
      status: 'PASS',
      detail: 'Standard System Program owner. Not an unverified proxy or smart contract program.',
    });
  } else {
    score -= 15;
    checks.push({
      category: 'Program Authority',
      status: 'WARN',
      detail: `Owned by custom program \`${formatAddress(ownerProgram, 4)}\`. Verify contract permissions.`,
    });
  }

  // 2. Token Delegate Approval & Authority Check
  let hasDelegation = false;
  for (const t of tokenAccounts) {
    if (t.delegate) {
      hasDelegation = true;
      unlimitedApprovals++;
    }
  }

  if (hasDelegation) {
    score -= 30;
    checks.push({
      category: 'Token Approvals',
      status: 'FAIL',
      detail: `Found **${unlimitedApprovals} delegated token approvals**. Potential drain risk if delegates are malicious.`,
    });
  } else {
    checks.push({
      category: 'Token Approvals',
      status: 'PASS',
      detail: '0 active token delegations. No external contracts have permission to transfer tokens.',
    });
  }

  // 3. Phishing & Airdrop Scam Token Check
  for (const t of tokenAccounts) {
    const sym = (t.token_symbol || t.symbol || '').toLowerCase();
    const name = (t.token_name || t.name || '').toLowerCase();
    if (
      sym.includes('claim') ||
      sym.includes('voucher') ||
      name.includes('.io') ||
      name.includes('.com') ||
      name.includes('claim') ||
      name.includes('visit')
    ) {
      flaggedTokens.push(t.token_name || t.token_symbol || t.token_address);
    }
  }

  if (flaggedTokens.length > 0) {
    score -= 20;
    checks.push({
      category: 'Suspicious / Spam Tokens',
      status: 'WARN',
      detail: `Detected **${flaggedTokens.length} suspicious airdrop token(s)** with promotional URLs. Do not interact with associated websites.`,
    });
  } else {
    checks.push({
      category: 'Suspicious / Spam Tokens',
      status: 'PASS',
      detail: 'No obvious phishing voucher or fake airdrop tokens identified.',
    });
  }

  // 4. Failed Transaction Ratio & Drainer Patterns
  const failedTxs = transactions.filter((t: any) => t.status === 'Failed');
  if (transactions.length > 0 && failedTxs.length / transactions.length > 0.4) {
    score -= 15;
    checks.push({
      category: 'Execution Stability',
      status: 'WARN',
      detail: `High transaction failure rate (${failedTxs.length}/${transactions.length}). Could indicate bot spam or failed exploit attempts.`,
    });
  } else {
    checks.push({
      category: 'Execution Stability',
      status: 'PASS',
      detail: `Normal execution stability (${transactions.length - failedTxs.length}/${transactions.length || 1} successful).`,
    });
  }

  // Final score & rating
  score = Math.max(0, Math.min(100, score));
  let rating: SecurityAuditResult['rating'] = 'Clean';
  if (score < 50) rating = 'Critical Risk';
  else if (score < 75) rating = 'Moderate Risk';
  else if (score < 90) rating = 'Low Risk';

  const summary =
    score >= 90
      ? 'This wallet exhibits excellent security hygiene with no active token delegations, verified program ownership, and clean transaction histories.'
      : score >= 70
      ? 'This wallet is in good health but has minor warnings (e.g., suspicious airdrop tokens or high failure rates) that warrant review.'
      : 'High security risk detected! Exercise caution and review delegated approvals and transaction counterparties.';

  return {
    score,
    rating,
    summary,
    checks,
    flaggedTokens,
    unlimitedApprovals,
  };
}

export function formatSecurityAuditReport(audit: SecurityAuditResult, walletAddress: string): string {
  const shortAddr = formatAddress(walletAddress, 4);
  const badgeColor =
    audit.score >= 90 ? '🟢' : audit.score >= 70 ? '🟡' : '🔴';

  let md = `### Wallet Security & Threat Audit: [${shortAddr}](https://solscan.io/account/${walletAddress})\n\n`;
  md += `**Safety Score:** ${badgeColor} **${audit.score}/100** (\`${audit.rating}\`)\n\n`;
  md += `**Summary:** ${audit.summary}\n\n`;

  md += `| Security Check | Status | Diagnostic Finding |\n`;
  md += `| :--- | :---: | :--- |\n`;

  for (const c of audit.checks) {
    const sBadge =
      c.status === 'PASS' ? '✅ `PASS`' : c.status === 'WARN' ? '⚠️ `WARN`' : '🚨 `FAIL`';
    md += `| **${c.category}** | ${sBadge} | ${c.detail} |\n`;
  }

  if (audit.flaggedTokens.length > 0) {
    md += `\n> [!WARNING]\n> **Flagged Suspicious Mints:** ${audit.flaggedTokens.map((t) => `\`${t}\``).join(', ')}. Avoid interacting with or signing transactions for these accounts.\n`;
  }

  return md;
}

export interface MultiHopHop {
  hopNumber: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  symbol: string;
  signature: string;
  blockTime: number;
  toLabel: string;
}

export interface MultiHopTraceResult {
  sourceWallet: string;
  hops: MultiHopHop[];
  destinationEntity: string;
  isCexDeposit: boolean;
}

export function formatMultiHopReport(trace: MultiHopTraceResult): string {
  const shortSource = formatAddress(trace.sourceWallet, 4);
  let md = `### Multi-Hop "Follow the Money" Path Tracer\n\n`;
  md += `Tracing outbound fund flow from **[${shortSource}](https://solscan.io/account/${trace.sourceWallet})**:\n\n`;

  if (trace.hops.length === 0) {
    return md + `*No outbound multi-hop movements detected in the recent transaction window.*\n`;
  }

  md += `| Hop | Sender | Recipient | Amount | Time | Transaction Proof |\n`;
  md += `| :---: | :--- | :--- | :---: | :---: | :---: |\n`;

  for (const h of trace.hops) {
    const fromLink = `[${formatAddress(h.fromAddress, 4)}](https://solscan.io/account/${h.fromAddress})`;
    const toLink = `[${formatAddress(h.toAddress, 4)}](https://solscan.io/account/${h.toAddress})`;
    const labelStr = h.toLabel !== 'Unlabeled' ? ` (${h.toLabel})` : '';
    const proofLink = `[tx: ${formatAddress(h.signature, 4)}](https://solscan.io/tx/${h.signature})`;
    const timeStr = new Date(h.blockTime * 1000).toISOString().replace('T', ' ').slice(0, 19);
    md += `| **#${h.hopNumber}** | ${fromLink} | ${toLink}${labelStr} | **${h.amount.toFixed(4)} ${h.symbol}** | ${timeStr} | ${proofLink} |\n`;
  }

  md += `\n**Final Terminal Entity:** **${trace.destinationEntity}** ${trace.isCexDeposit ? '*(Centralized Exchange Deposit)*' : ''}\n`;
  return md;
}

export type {
  AccountDetail,
  TokenAccountHolding as TokenAccount,
  TransactionDetail as TransactionRecord,
} from './mock-data';



