/**
 * Solana Entity Labeling Registry & Heuristics
 * Identifies known DEX programs, system programs, token programs, and major CEX deposit hot wallets.
 */

export type EntityCategory = 'dex' | 'cex' | 'system' | 'token' | 'user';

export interface EntityInfo {
  label: string;
  category: EntityCategory;
  name?: string;
  website?: string;
}

/**
 * Canonical registry of known Solana entities and program IDs
 */
export const KNOWN_ENTITIES: Record<string, EntityInfo> = {
  // ─── DEX Programs ───────────────────────────────────────────────────────────
  // Jupiter
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': {
    label: 'Jupiter (DEX)',
    category: 'dex',
    name: 'Jupiter Aggregator v6',
  },
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': {
    label: 'Jupiter v4 (DEX)',
    category: 'dex',
    name: 'Jupiter Aggregator v4',
  },
  'JUP2jRwwHG9CmTXMEbuFDjL2JnqxQB2hGrrADd74uZZ': {
    label: 'Jupiter v2 (DEX)',
    category: 'dex',
    name: 'Jupiter Aggregator v2',
  },
  'DSwapAASMmhkgnc2hkDgiUh8YsWQU8bDP21PBFbgDeU': {
    label: 'Jupiter DCA (DEX)',
    category: 'dex',
    name: 'Jupiter DCA Program',
  },
  'jupoNjAxXHgKuTxWmytBYwptUbYTpmP5vTGLpdZdUuh': {
    label: 'Jupiter Limit Order (DEX)',
    category: 'dex',
    name: 'Jupiter Limit Order Program',
  },

  // Raydium
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': {
    label: 'Raydium Liquidity Pool V4 (DEX)',
    category: 'dex',
    name: 'Raydium AMM V4',
  },
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': {
    label: 'Raydium CLMM (DEX)',
    category: 'dex',
    name: 'Raydium Concentrated Liquidity',
  },
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': {
    label: 'Raydium CPMM (DEX)',
    category: 'dex',
    name: 'Raydium Constant Product Swap',
  },
  'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS': {
    label: 'Raydium Router (DEX)',
    category: 'dex',
    name: 'Raydium Route Swap',
  },
  '27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv': {
    label: 'Raydium Pool V3 (DEX)',
    category: 'dex',
    name: 'Raydium AMM V3',
  },

  // Orca
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': {
    label: 'Orca Whirlpool (DEX)',
    category: 'dex',
    name: 'Orca Whirlpools Concentrated Liquidity',
  },
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': {
    label: 'Orca Swap v2 (DEX)',
    category: 'dex',
    name: 'Orca AMM v2',
  },
  'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1': {
    label: 'Orca Swap v1 (DEX)',
    category: 'dex',
    name: 'Orca AMM v1',
  },

  // Meteora
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': {
    label: 'Meteora DLMM (DEX)',
    category: 'dex',
    name: 'Meteora Dynamic Liquidity Market Maker',
  },
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB': {
    label: 'Meteora Dynamic Pools (DEX)',
    category: 'dex',
    name: 'Meteora Dynamic Pools Program',
  },
  '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHUX2Aev3Z26QJGs': {
    label: 'Meteora DBC (DEX)',
    category: 'dex',
    name: 'Meteora Dynamic Bonding Curve',
  },

  // ─── System & Core Native Programs ──────────────────────────────────────────
  '11111111111111111111111111111111': {
    label: 'System Program',
    category: 'system',
    name: 'Solana System Program',
  },
  'ComputeBudget111111111111111111111111111111': {
    label: 'Compute Budget Program',
    category: 'system',
    name: 'Solana Compute Budget',
  },
  'Config1111111111111111111111111111111111111': {
    label: 'Config Program',
    category: 'system',
    name: 'Solana Configuration Program',
  },
  'Stake11111111111111111111111111111111111111': {
    label: 'Stake Program',
    category: 'system',
    name: 'Solana Native Stake Program',
  },
  'Vote111111111111111111111111111111111111111': {
    label: 'Vote Program',
    category: 'system',
    name: 'Solana Native Vote Program',
  },

  // ─── Token Programs ─────────────────────────────────────────────────────────
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': {
    label: 'Token Program',
    category: 'token',
    name: 'SPL Token Program',
  },
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': {
    label: 'Token-2022 Program',
    category: 'token',
    name: 'SPL Token-2022 Program',
  },
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': {
    label: 'Associated Token Program',
    category: 'token',
    name: 'Associated Token Account Program',
  },

  // ─── Centralized Exchange (CEX) Hot Wallets ─────────────────────────────────
  // Binance
  '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9': {
    label: 'Binance (Hot Wallet 2)',
    category: 'cex',
    name: 'Binance Exchange Deposit / Hot Wallet',
  },
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': {
    label: 'Binance (Hot Wallet)',
    category: 'cex',
    name: 'Binance Hot Wallet',
  },
  '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S': {
    label: 'Binance (Hot Wallet 3)',
    category: 'cex',
    name: 'Binance Hot Wallet 3',
  },

  // Coinbase
  '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm': {
    label: 'Coinbase (Hot Wallet 2)',
    category: 'cex',
    name: 'Coinbase Exchange Hot Wallet 2',
  },
  'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS': {
    label: 'Coinbase (Hot Wallet 1)',
    category: 'cex',
    name: 'Coinbase Hot Wallet 1',
  },
  '2GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE': {
    label: 'Coinbase (Hot Wallet)',
    category: 'cex',
    name: 'Coinbase Hot Wallet',
  },
  'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPgv7npb': {
    label: 'Coinbase Prime',
    category: 'cex',
    name: 'Coinbase Prime Custody',
  },
  '2AQdpHJ2JpcEgPiATUXjQxA8QmaNakedHwgU7JwfZg1Fe': {
    label: 'Coinbase (Exchange)',
    category: 'cex',
    name: 'Coinbase Exchange Wallet',
  },

  // Kraken
  'FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5': {
    label: 'Kraken (Hot Wallet)',
    category: 'cex',
    name: 'Kraken Exchange Hot Wallet',
  },
  'FWznbcNXWQuHTawe9RxvQ2LdJF243sZ62c64r21oKkBH': {
    label: 'Kraken (Hot Wallet 2)',
    category: 'cex',
    name: 'Kraken Exchange Hot Wallet 2',
  },

  // Bybit
  'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2': {
    label: 'Bybit (Hot Wallet)',
    category: 'cex',
    name: 'Bybit Exchange Hot Wallet',
  },
  'AC5RDfQFmDS1deWZos921qbhirGLTgRyrYZdmZ9XRDCQ': {
    label: 'Bybit (Hot Wallet 2)',
    category: 'cex',
    name: 'Bybit Hot Wallet 2',
  },

  // OKX
  '5VCwKtCXgCJ6kit5FybXjvms3e1qBvW9142PZk97x8V9': {
    label: 'OKX (Hot Wallet)',
    category: 'cex',
    name: 'OKX Exchange Hot Wallet',
  },
};

/**
 * Return human-readable label and category for a Solana address.
 * Follows exact specifications:
 * - Recognizes Jupiter, Raydium, Orca, Meteora DEXes
 * - Recognizes System Program (1111...)
 * - Recognizes Token Program
 * - Recognizes prominent CEX deposit hot wallets (Binance, Coinbase, Kraken, Bybit)
 * - Returns { label: 'unlabeled', category: 'user' } for unrecognized addresses
 */
export function labelAddress(
  address: string
): { label: string; category: EntityCategory } {
  if (!address || typeof address !== 'string') {
    return { label: 'unlabeled', category: 'user' };
  }

  const cleanAddr = address.trim();

  // 1. Direct registry lookup
  if (KNOWN_ENTITIES[cleanAddr]) {
    const entry = KNOWN_ENTITIES[cleanAddr];
    return { label: entry.label, category: entry.category };
  }

  // 2. Case-insensitive lookup fallback
  const lowerAddr = cleanAddr.toLowerCase();
  for (const [key, val] of Object.entries(KNOWN_ENTITIES)) {
    if (key.toLowerCase() === lowerAddr) {
      return { label: val.label, category: val.category };
    }
  }

  // 3. Known Prefix / Vanity heuristics
  if (cleanAddr.startsWith('JUP') || cleanAddr.startsWith('jup')) {
    return { label: 'Jupiter (DEX)', category: 'dex' };
  }
  if (cleanAddr.startsWith('whirL') || cleanAddr.startsWith('whirl')) {
    return { label: 'Orca Whirlpool (DEX)', category: 'dex' };
  }
  if (cleanAddr.startsWith('LBUZ') || cleanAddr.startsWith('lbuz')) {
    return { label: 'Meteora DLMM (DEX)', category: 'dex' };
  }
  if (cleanAddr.startsWith('11111111111111111111111111111111')) {
    return { label: 'System Program', category: 'system' };
  }
  if (cleanAddr.startsWith('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) {
    return { label: 'Token Program', category: 'token' };
  }

  // 4. Unrecognized addresses default to 'unlabeled' and category 'user'
  return { label: 'unlabeled', category: 'user' };
}

/**
 * Shorten a Solana base58 address for display (e.g. 7xKX...abc)
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Check if an address is a known program or verified exchange
 */
export function isKnownEntity(address: string): boolean {
  return labelAddress(address).category !== 'user';
}

/**
 * Convert category to UI table badge styling format
 */
export function getCategoryBadge(category: EntityCategory): {
  name: string;
  className: string;
} {
  switch (category) {
    case 'dex':
      return { name: 'DEX', className: 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/30' };
    case 'cex':
      return { name: 'CEX', className: 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30' };
    case 'system':
      return { name: 'System', className: 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30' };
    case 'token':
      return { name: 'Token', className: 'bg-[#60A5FA]/10 text-[#60A5FA] border-[#60A5FA]/30' };
    case 'user':
    default:
      return { name: 'Unlabeled', className: 'bg-[#2A2C31]/40 text-[#9AA0AB] border-[#2A2C31]' };
  }
}
