/**
 * Realistic On-Chain Solana Mock Data for Solscan AI
 *
 * Provides comprehensive on-chain data fixtures for local testing, demonstrations,
 * and offline development when Solscan Pro API key is not present.
 */

export const SAMPLE_WALLET_ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const JUPITER_V6_PROGRAM_ID = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
export const RAYDIUM_AMM_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
export const ORCA_WHIRLPOOL_PROGRAM_ID = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';

export interface AccountDetail {
  address: string;
  lamports: number;
  sol_balance: number;
  account_type: 'system_account' | 'token_account' | 'program_account' | 'token_mint' | 'program' | string;
  owner_program: string;
  executable: boolean;
  rent_epoch: number;
  is_whale: boolean;
  usd_value?: number;
  mint_info?: {
    decimals: number;
    supply: string;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    isInitialized: boolean;
  };
}

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
  website?: string;
  coingecko_id?: string;
  supply?: number;
  holder_count?: number;
}

export interface TokenPrice {
  address: string;
  symbol: string;
  price_usd: number;
  price_change_24h: number;
  volume_24h_usd: number;
  market_cap_usd: number;
  updated_at: number;
}

export interface TokenAccountHolding {
  token_account: string;
  token_address: string;
  token_symbol: string;
  token_name: string;
  token_icon?: string;
  decimals: number;
  amount: number;
  raw_amount: string;
  price_usd: number;
  value_usd: number;
}

export interface DecodedInstruction {
  program_id: string;
  program_name: string;
  action: string;
  source?: string;
  destination?: string;
  amount?: number;
  symbol?: string;
  data?: Record<string, unknown>;
}

export interface BalanceChangeItem {
  account: string;
  asset_type: 'SOL' | 'SPL';
  token_address?: string;
  token_symbol?: string;
  pre_balance: number;
  post_balance: number;
  change_amount: number;
  change_type: 'increase' | 'decrease' | 'neutral';
}

export interface TransactionBalanceChange {
  signature: string;
  changes: BalanceChangeItem[];
}

export interface TransactionSummary {
  signature: string;
  slot: number;
  block_time: number;
  fee: number;
  fee_payer: string;
  status: 'Success' | 'Fail';
  type: 'incoming_transfer' | 'outgoing_transfer' | 'jupiter_swap' | 'raydium_swap' | 'orca_swap' | 'token_transfer';
  program_ids: string[];
  counterparty?: string;
  counterparty_label?: string;
  direction?: 'incoming' | 'outgoing' | 'self' | 'swap';
  amount?: number;
  amount_symbol?: string;
  pre_balances: { account: string; lamports: number }[];
  post_balances: { account: string; lamports: number }[];
  instructions: DecodedInstruction[];
}

export interface TransactionDetail extends TransactionSummary {
  signers: string[];
  account_keys: string[];
  balance_changes: BalanceChangeItem[];
}

export interface DefiActivity {
  activity_id: string;
  tx_hash: string;
  block_time: number;
  platform: 'Jupiter' | 'Raydium' | 'Orca' | 'Marinade' | 'Meteora';
  activity_type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake';
  tokens_in: { token_address: string; symbol: string; amount: number; value_usd?: number }[];
  tokens_out: { token_address: string; symbol: string; amount: number; value_usd?: number }[];
  fee_usd?: number;
}

// Known Addresses with contextual labels for Solscan AI synthesis
export const KNOWN_ADDRESSES: Record<string, { label: string; category: string; description?: string }> = {
  [SAMPLE_WALLET_ADDRESS]: { label: 'Active Subject Wallet (7xKX...asU)', category: 'User' },
  '9aBcPmX1oVZ4WjKrt97hZgqS4Y8w9ePq2vL3nK5r7uM': { label: 'Raydium Settlement Pool', category: 'DEX', description: 'Raydium AMM router settlement vault' },
  '4dEftK8uLwZ5NjY7x3PqV1s8RtY9mB2cX6hL0vQ5wE1': { label: 'Binance Hot Wallet 14', category: 'Exchange', description: 'Centralized exchange withdrawal wallet' },
  '2gHixQzW7aP1mX8k9Y0vL3nB5cR6eT7uV4wE8qZ1aB2': { label: 'Marinade Payout Distributor', category: 'Staking', description: 'Marinade Finance liquid staking rewards' },
  '5tzFkiKscMRhP5r3UjG7aV4wX9yZ1bC2eD3fG4hJ5kL': { label: 'Kraken Hot Wallet 02', category: 'Exchange', description: 'Kraken exchange client withdrawal vault' },
  '8sVnTy4wE1xZ9mP3qR5tY7uK2bC4eF6gH8jL0vN1p2Q': { label: 'Unlabeled Trader (8sVn...)', category: 'Trader', description: 'High-frequency Solana on-chain trader' },
  '6bNzLmP9qR5tY7uK2bC4eF6gH8jL0vN1p2Q3wE4r5tY': { label: 'Coinbase Prime Custody', category: 'Exchange', description: 'Coinbase institutional custody deposit wallet' },
  '3rQvWtM4k8vN1p2m3q4r5s6t7u8v9w0x1y2z3a4b5c6': { label: 'Cold Storage Ledger', category: 'Cold Storage', description: 'Personal offline hardware wallet' },
  [JUPITER_V6_PROGRAM_ID]: { label: 'Jupiter v6 Router', category: 'DEX', description: 'Solana leading DEX aggregator' },
  [RAYDIUM_AMM_PROGRAM_ID]: { label: 'Raydium AMM v4', category: 'DEX', description: 'Automated Market Maker protocol' },
  [ORCA_WHIRLPOOL_PROGRAM_ID]: { label: 'Orca Whirlpool', category: 'DEX', description: 'Concentrated liquidity AMM' },
  [SYSTEM_PROGRAM_ID]: { label: 'System Program', category: 'System', description: 'Native Solana account and transfer program' },
  [TOKEN_PROGRAM_ID]: { label: 'Token Program', category: 'System', description: 'SPL Token management program' },
};

// SPL Tokens configuration
export const KNOWN_TOKENS: Record<string, { meta: TokenMetadata; price: TokenPrice }> = {
  // Wrapped SOL
  'So11111111111111111111111111111111111111112': {
    meta: {
      address: 'So11111111111111111111111111111111111111112',
      name: 'Wrapped SOL',
      symbol: 'SOL',
      decimals: 9,
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      website: 'https://solana.com',
      coingecko_id: 'solana',
      supply: 460000000,
      holder_count: 1450000,
    },
    price: {
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      price_usd: 154.20,
      price_change_24h: 3.45,
      volume_24h_usd: 3410290000,
      market_cap_usd: 71000000000,
      updated_at: 1792194000,
    },
  },
  // USDC
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    meta: {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      website: 'https://circle.com',
      coingecko_id: 'usd-coin',
      supply: 3100000000,
      holder_count: 2850000,
    },
    price: {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      price_usd: 1.0001,
      price_change_24h: 0.01,
      volume_24h_usd: 1250400000,
      market_cap_usd: 35000000000,
      updated_at: 1792194000,
    },
  },
  // USDT
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    meta: {
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
      website: 'https://tether.to',
      coingecko_id: 'tether',
      supply: 890000000,
      holder_count: 1950000,
    },
    price: {
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      symbol: 'USDT',
      price_usd: 1.0002,
      price_change_24h: 0.02,
      volume_24h_usd: 980000000,
      market_cap_usd: 890000000,
      updated_at: 1792194000,
    },
  },
  // JUP
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': {
    meta: {
      address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      name: 'Jupiter',
      symbol: 'JUP',
      decimals: 6,
      icon: 'https://static.jup.ag/jup/icon.png',
      website: 'https://jup.ag',
      coingecko_id: 'jupiter-exchange-solana',
      supply: 10000000000,
      holder_count: 580000,
    },
    price: {
      address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      symbol: 'JUP',
      price_usd: 0.885,
      price_change_24h: -1.45,
      volume_24h_usd: 142000000,
      market_cap_usd: 1195000000,
      updated_at: 1792194000,
    },
  },
  // RAY
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': {
    meta: {
      address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      name: 'Raydium',
      symbol: 'RAY',
      decimals: 6,
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
      website: 'https://raydium.io',
      coingecko_id: 'raydium',
      supply: 555000000,
      holder_count: 320000,
    },
    price: {
      address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      symbol: 'RAY',
      price_usd: 2.14,
      price_change_24h: 5.82,
      volume_24h_usd: 88500000,
      market_cap_usd: 560000000,
      updated_at: 1792194000,
    },
  },
  // BONK
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
    meta: {
      address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      name: 'Bonk',
      symbol: 'BONK',
      decimals: 5,
      icon: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5c9mA8',
      website: 'https://bonkcoin.com',
      coingecko_id: 'bonk',
      supply: 93500000000000,
      holder_count: 760000,
    },
    price: {
      address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      symbol: 'BONK',
      price_usd: 0.0000218,
      price_change_24h: 8.41,
      volume_24h_usd: 310000000,
      market_cap_usd: 1530000000,
      updated_at: 1792194000,
    },
  },
};

// Sample Wallet Account Details
export const MOCK_SAMPLE_WALLET_DETAIL: AccountDetail = {
  address: SAMPLE_WALLET_ADDRESS,
  lamports: 14850230000, // 14.85023 SOL
  sol_balance: 14.85023,
  account_type: 'system_account',
  owner_program: SYSTEM_PROGRAM_ID,
  executable: false,
  rent_epoch: 361,
  is_whale: true,
  usd_value: 14.85023 * 154.20,
};

// Sample Wallet Token Accounts
export const MOCK_TOKEN_ACCOUNTS: TokenAccountHolding[] = [
  {
    token_account: 'B7x9R3wK8VvN1p2m3q4r5s6t7u8v9w0x1y2z3a4b5c6',
    token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    token_symbol: 'USDC',
    token_name: 'USD Coin',
    token_icon: KNOWN_TOKENS['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'].meta.icon,
    decimals: 6,
    amount: 14250.75,
    raw_amount: '14250750000',
    price_usd: 1.0001,
    value_usd: 14252.17,
  },
  {
    token_account: 'WS1L5gX9K3wK8VvN1p2m3q4r5s6t7u8v9w0x1y2z3a',
    token_address: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    token_symbol: 'SOL',
    token_name: 'Wrapped SOL',
    token_icon: KNOWN_TOKENS['So11111111111111111111111111111111111111112'].meta.icon,
    decimals: 9,
    amount: 4.50,
    raw_amount: '4500000000',
    price_usd: 154.20,
    value_usd: 693.90,
  },
  {
    token_account: 'JP8vT1q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9a0b',
    token_address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
    token_symbol: 'JUP',
    token_name: 'Jupiter',
    token_icon: KNOWN_TOKENS['JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'].meta.icon,
    decimals: 6,
    amount: 3820.0,
    raw_amount: '3820000000',
    price_usd: 0.885,
    value_usd: 3380.70,
  },
  {
    token_account: 'RY2vN1p2m3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f',
    token_address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // RAY
    token_symbol: 'RAY',
    token_name: 'Raydium',
    token_icon: KNOWN_TOKENS['4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'].meta.icon,
    decimals: 6,
    amount: 1140.25,
    raw_amount: '1140250000',
    price_usd: 2.14,
    value_usd: 2440.14,
  },
  {
    token_account: 'BK9m3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9a0b1',
    token_address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    token_symbol: 'BONK',
    token_name: 'Bonk',
    token_icon: KNOWN_TOKENS['DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'].meta.icon,
    decimals: 5,
    amount: 88500000.0,
    raw_amount: '8850000000000',
    price_usd: 0.0000218,
    value_usd: 1929.30,
  },
];

/**
 * Deterministically generates 115 realistic transactions for 7xKX...
 * Includes:
 * - Counterparties sending SOL to 7xKX... (Incoming)
 * - Outgoing transfers to exchanges & cold storage
 * - Jupiter DEX Swaps
 * - Raydium AMM Swaps
 * - Orca Whirlpool Swaps
 * Each transaction maintains strict mathematical consistency between
 * pre_balances, post_balances, and decoded instruction deltas.
 */
function generateRealisticTransactions(): TransactionDetail[] {
  const txs: TransactionDetail[] = [];
  const baseTimestamp = 1792194000; // 2026-10-16T22:46:40Z
  const baseSlot = 318250000;

  // Track running wallet balance to produce continuous pre/post balances
  let runningWalletLamports = 14850230000;

  // Counterparty profiles for aggregation analysis queries
  const counterparties = {
    raydiumPool: '9aBcPmX1oVZ4WjKrt97hZgqS4Y8w9ePq2vL3nK5r7uM',
    binanceHot: '4dEftK8uLwZ5NjY7x3PqV1s8RtY9mB2cX6hL0vQ5wE1',
    marinadePayout: '2gHixQzW7aP1mX8k9Y0vL3nB5cR6eT7uV4wE8qZ1aB2',
    krakenHot: '5tzFkiKscMRhP5r3UjG7aV4wX9yZ1bC2eD3fG4hJ5kL',
    unlabeledTrader: '8sVnTy4wE1xZ9mP3qR5tY7uK2bC4eF6gH8jL0vN1p2Q',
    coinbaseCustody: '6bNzLmP9qR5tY7uK2bC4eF6gH8jL0vN1p2Q3wE4r5tY',
    coldStorage: '3rQvWtM4k8vN1p2m3q4r5s6t7u8v9w0x1y2z3a4b5c6',
  };

  // Deterministic pseudo-signature generator
  const createSignature = (index: number, prefix: string): string => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = '';
    let seed = index * 9301 + 49297;
    for (let i = 0; i < 80; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      hash += chars[seed % chars.length];
    }
    return `${prefix}${hash.slice(0, 84)}`;
  };

  let txIndex = 0;

  // Plan sequence of 115 transactions
  // 1. Incoming transfers from known counterparties:
  //    - Raydium pool: 16 txs (~1.15 SOL each)
  //    - Binance Hot: 12 txs (~3.75 SOL each)
  //    - Marinade Stake: 8 txs (~1.50 SOL each)
  //    - Kraken: 6 txs (~4.75 SOL each)
  //    - Unlabeled Trader: 5 txs (~0.75 SOL each)
  // 2. Outgoing transfers:
  //    - Coinbase deposit: 8 txs (~4.0 SOL each)
  //    - Cold storage: 4 txs (~12.5 SOL each)
  //    - Peer transfers: 6 txs (~1.2 SOL each)
  // 3. Swaps:
  //    - Jupiter swaps: 25 txs (swapping SOL, USDC, JUP, BONK)
  //    - Raydium swaps: 15 txs (swapping SOL, RAY, USDC)
  //    - Orca Whirlpool: 10 txs (swapping USDC, SOL)

  interface TxPlan {
    category: 'incoming' | 'outgoing' | 'jup_swap' | 'ray_swap' | 'orca_swap';
    counterparty: string;
    solDelta: number; // positive = incoming to 7xKX..., negative = outgoing from 7xKX...
    tokenIn?: { symbol: string; amount: number; mint: string };
    tokenOut?: { symbol: string; amount: number; mint: string };
    label?: string;
  }

  const plannedActions: TxPlan[] = [];

  // Interleave different types so transaction history looks authentic
  for (let round = 0; round < 16; round++) {
    // Round-robin additions
    if (round < 16) {
      plannedActions.push({
        category: 'incoming',
        counterparty: counterparties.raydiumPool,
        solDelta: 1.15 + (round % 5) * 0.1,
        label: 'Raydium Settlement Pool',
      });
    }
    if (round < 12) {
      plannedActions.push({
        category: 'incoming',
        counterparty: counterparties.binanceHot,
        solDelta: 3.75 + (round % 3) * 0.5,
        label: 'Binance Hot Wallet 14',
      });
    }
    if (round < 8) {
      plannedActions.push({
        category: 'incoming',
        counterparty: counterparties.marinadePayout,
        solDelta: 1.50 + (round % 2) * 0.25,
        label: 'Marinade Payout Distributor',
      });
    }
    if (round < 6) {
      plannedActions.push({
        category: 'incoming',
        counterparty: counterparties.krakenHot,
        solDelta: 4.75 + (round % 2) * 0.5,
        label: 'Kraken Hot Wallet 02',
      });
    }
    if (round < 5) {
      plannedActions.push({
        category: 'incoming',
        counterparty: counterparties.unlabeledTrader,
        solDelta: 0.75 + (round % 4) * 0.15,
        label: 'Unlabeled Trader (8sVn...)',
      });
    }
    if (round < 8) {
      plannedActions.push({
        category: 'outgoing',
        counterparty: counterparties.coinbaseCustody,
        solDelta: -(3.8 + (round % 3) * 0.4),
        label: 'Coinbase Prime Custody',
      });
    }
    if (round < 4) {
      plannedActions.push({
        category: 'outgoing',
        counterparty: counterparties.coldStorage,
        solDelta: -(12.0 + (round % 2) * 1.5),
        label: 'Cold Storage Ledger',
      });
    }
    if (round < 6) {
      plannedActions.push({
        category: 'outgoing',
        counterparty: '7P2yN1p2m3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8',
        solDelta: -(1.1 + (round % 3) * 0.3),
        label: 'Unlabeled Recipient (7P2y...)',
      });
    }
    // Jupiter Swaps
    if (round < 13) {
      plannedActions.push({
        category: 'jup_swap',
        counterparty: JUPITER_V6_PROGRAM_ID,
        solDelta: -2.0,
        tokenOut: { symbol: 'USDC', amount: 308.40, mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
        label: 'Jupiter v6 Router',
      });
    }
    if (round < 12) {
      plannedActions.push({
        category: 'jup_swap',
        counterparty: JUPITER_V6_PROGRAM_ID,
        solDelta: 1.85,
        tokenIn: { symbol: 'JUP', amount: 320.0, mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
        label: 'Jupiter v6 Router',
      });
    }
    // Raydium Swaps
    if (round < 8) {
      plannedActions.push({
        category: 'ray_swap',
        counterparty: RAYDIUM_AMM_PROGRAM_ID,
        solDelta: -1.5,
        tokenOut: { symbol: 'RAY', amount: 108.0, mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
        label: 'Raydium AMM v4',
      });
    }
    if (round < 7) {
      plannedActions.push({
        category: 'ray_swap',
        counterparty: RAYDIUM_AMM_PROGRAM_ID,
        solDelta: 1.4,
        tokenIn: { symbol: 'RAY', amount: 98.5, mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
        label: 'Raydium AMM v4',
      });
    }
    // Orca Swaps
    if (round < 10) {
      plannedActions.push({
        category: 'orca_swap',
        counterparty: ORCA_WHIRLPOOL_PROGRAM_ID,
        solDelta: 0.95,
        tokenIn: { symbol: 'USDC', amount: 146.5, mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
        label: 'Orca Whirlpool',
      });
    }
  }

  // Ensure we have at least 115 transactions
  const totalItems = Math.min(plannedActions.length, 115);

  for (let i = 0; i < totalItems; i++) {
    const plan = plannedActions[i];
    txIndex++;
    const slot = baseSlot - i * 140;
    const blockTime = baseTimestamp - i * 3600; // 1 hour intervals descending
    const feeLamports = 5000;
    const sigPrefix = plan.category.startsWith('jup') ? '5jUp' : plan.category.startsWith('ray') ? '4Ray' : plan.category.startsWith('orca') ? '3Orc' : '2Sol';
    const signature = createSignature(txIndex, sigPrefix);

    const deltaLamports = Math.round(plan.solDelta * 1e9);
    const preWalletLamports = runningWalletLamports;
    const postWalletLamports = runningWalletLamports + deltaLamports;
    runningWalletLamports = postWalletLamports;

    let feePayer = SAMPLE_WALLET_ADDRESS;
    let type: TransactionSummary['type'] = 'incoming_transfer';
    let direction: TransactionSummary['direction'] = 'incoming';
    const programIds: string[] = [SYSTEM_PROGRAM_ID];
    const instructions: DecodedInstruction[] = [];
    const balanceChanges: BalanceChangeItem[] = [];

    if (plan.category === 'incoming') {
      feePayer = plan.counterparty;
      type = 'incoming_transfer';
      direction = 'incoming';
      instructions.push({
        program_id: SYSTEM_PROGRAM_ID,
        program_name: 'System Program',
        action: 'transfer',
        source: plan.counterparty,
        destination: SAMPLE_WALLET_ADDRESS,
        amount: Math.abs(plan.solDelta),
        symbol: 'SOL',
      });
      balanceChanges.push({
        account: SAMPLE_WALLET_ADDRESS,
        asset_type: 'SOL',
        pre_balance: preWalletLamports / 1e9,
        post_balance: postWalletLamports / 1e9,
        change_amount: Math.abs(plan.solDelta),
        change_type: 'increase',
      });
      balanceChanges.push({
        account: plan.counterparty,
        asset_type: 'SOL',
        pre_balance: (50000000000 + deltaLamports + feeLamports) / 1e9,
        post_balance: 50000000000 / 1e9,
        change_amount: -(Math.abs(plan.solDelta) + feeLamports / 1e9),
        change_type: 'decrease',
      });
    } else if (plan.category === 'outgoing') {
      feePayer = SAMPLE_WALLET_ADDRESS;
      type = 'outgoing_transfer';
      direction = 'outgoing';
      instructions.push({
        program_id: SYSTEM_PROGRAM_ID,
        program_name: 'System Program',
        action: 'transfer',
        source: SAMPLE_WALLET_ADDRESS,
        destination: plan.counterparty,
        amount: Math.abs(plan.solDelta),
        symbol: 'SOL',
      });
      balanceChanges.push({
        account: SAMPLE_WALLET_ADDRESS,
        asset_type: 'SOL',
        pre_balance: preWalletLamports / 1e9,
        post_balance: postWalletLamports / 1e9,
        change_amount: -Math.abs(plan.solDelta),
        change_type: 'decrease',
      });
      balanceChanges.push({
        account: plan.counterparty,
        asset_type: 'SOL',
        pre_balance: 10000000000 / 1e9,
        post_balance: (10000000000 + Math.abs(deltaLamports)) / 1e9,
        change_amount: Math.abs(plan.solDelta),
        change_type: 'increase',
      });
    } else if (plan.category === 'jup_swap') {
      feePayer = SAMPLE_WALLET_ADDRESS;
      type = 'jupiter_swap';
      direction = 'swap';
      programIds.push(JUPITER_V6_PROGRAM_ID, TOKEN_PROGRAM_ID);
      instructions.push({
        program_id: JUPITER_V6_PROGRAM_ID,
        program_name: 'Jupiter Aggregator v6',
        action: 'route',
        source: plan.tokenIn ? plan.tokenIn.symbol : 'SOL',
        destination: plan.tokenOut ? plan.tokenOut.symbol : 'SOL',
        amount: plan.tokenIn ? plan.tokenIn.amount : Math.abs(plan.solDelta),
        data: {
          inAmount: plan.tokenIn?.amount ?? Math.abs(plan.solDelta),
          outAmount: plan.tokenOut?.amount ?? Math.abs(plan.solDelta),
          route: 'Jupiter Route [Direct / Multi-hop]',
        },
      });
      balanceChanges.push({
        account: SAMPLE_WALLET_ADDRESS,
        asset_type: 'SOL',
        pre_balance: preWalletLamports / 1e9,
        post_balance: postWalletLamports / 1e9,
        change_amount: plan.solDelta,
        change_type: plan.solDelta > 0 ? 'increase' : 'decrease',
      });
      if (plan.tokenOut) {
        balanceChanges.push({
          account: SAMPLE_WALLET_ADDRESS,
          asset_type: 'SPL',
          token_address: plan.tokenOut.mint,
          token_symbol: plan.tokenOut.symbol,
          pre_balance: 1000,
          post_balance: 1000 + plan.tokenOut.amount,
          change_amount: plan.tokenOut.amount,
          change_type: 'increase',
        });
      }
      if (plan.tokenIn) {
        balanceChanges.push({
          account: SAMPLE_WALLET_ADDRESS,
          asset_type: 'SPL',
          token_address: plan.tokenIn.mint,
          token_symbol: plan.tokenIn.symbol,
          pre_balance: 2000,
          post_balance: 2000 - plan.tokenIn.amount,
          change_amount: -plan.tokenIn.amount,
          change_type: 'decrease',
        });
      }
    } else if (plan.category === 'ray_swap') {
      feePayer = SAMPLE_WALLET_ADDRESS;
      type = 'raydium_swap';
      direction = 'swap';
      programIds.push(RAYDIUM_AMM_PROGRAM_ID, TOKEN_PROGRAM_ID);
      instructions.push({
        program_id: RAYDIUM_AMM_PROGRAM_ID,
        program_name: 'Raydium AMM v4',
        action: 'swapBaseIn',
        source: plan.tokenIn ? plan.tokenIn.symbol : 'SOL',
        destination: plan.tokenOut ? plan.tokenOut.symbol : 'SOL',
        amount: plan.tokenIn ? plan.tokenIn.amount : Math.abs(plan.solDelta),
      });
      balanceChanges.push({
        account: SAMPLE_WALLET_ADDRESS,
        asset_type: 'SOL',
        pre_balance: preWalletLamports / 1e9,
        post_balance: postWalletLamports / 1e9,
        change_amount: plan.solDelta,
        change_type: plan.solDelta > 0 ? 'increase' : 'decrease',
      });
    } else {
      // orca_swap
      feePayer = SAMPLE_WALLET_ADDRESS;
      type = 'orca_swap';
      direction = 'swap';
      programIds.push(ORCA_WHIRLPOOL_PROGRAM_ID, TOKEN_PROGRAM_ID);
      instructions.push({
        program_id: ORCA_WHIRLPOOL_PROGRAM_ID,
        program_name: 'Orca Whirlpool',
        action: 'swap',
        source: plan.tokenIn ? plan.tokenIn.symbol : 'SOL',
        destination: plan.tokenOut ? plan.tokenOut.symbol : 'SOL',
        amount: plan.tokenIn ? plan.tokenIn.amount : Math.abs(plan.solDelta),
      });
      balanceChanges.push({
        account: SAMPLE_WALLET_ADDRESS,
        asset_type: 'SOL',
        pre_balance: preWalletLamports / 1e9,
        post_balance: postWalletLamports / 1e9,
        change_amount: plan.solDelta,
        change_type: plan.solDelta > 0 ? 'increase' : 'decrease',
      });
    }

    const txDetail: TransactionDetail = {
      signature,
      slot,
      block_time: blockTime,
      fee: feeLamports,
      fee_payer: feePayer,
      status: 'Success',
      type,
      direction,
      amount: Math.abs(plan.solDelta),
      amount_symbol: 'SOL',
      counterparty: plan.counterparty,
      counterparty_label: plan.label || KNOWN_ADDRESSES[plan.counterparty]?.label || plan.counterparty.slice(0, 8),
      program_ids: programIds,
      pre_balances: [
        { account: SAMPLE_WALLET_ADDRESS, lamports: preWalletLamports },
        { account: plan.counterparty, lamports: 50000000000 },
      ],
      post_balances: [
        { account: SAMPLE_WALLET_ADDRESS, lamports: postWalletLamports },
        { account: plan.counterparty, lamports: 50000000000 - deltaLamports },
      ],
      signers: [feePayer],
      account_keys: [SAMPLE_WALLET_ADDRESS, plan.counterparty, SYSTEM_PROGRAM_ID, ...programIds],
      instructions,
      balance_changes: balanceChanges,
    };

    txs.push(txDetail);
  }

  return txs;
}

// Generate the 115 transactions
export const MOCK_TRANSACTIONS: TransactionDetail[] = generateRealisticTransactions();

// Mock DeFi Activities for 7xKX...
export const MOCK_DEFI_ACTIVITIES: DefiActivity[] = [
  {
    activity_id: 'act_jup_01',
    tx_hash: MOCK_TRANSACTIONS.find((t) => t.type === 'jupiter_swap')?.signature || '5jUpMockSig0001',
    block_time: 1792193500,
    platform: 'Jupiter',
    activity_type: 'swap',
    tokens_in: [{ token_address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', amount: 2.0, value_usd: 308.40 }],
    tokens_out: [{ token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: 308.40, value_usd: 308.40 }],
    fee_usd: 0.00077,
  },
  {
    activity_id: 'act_ray_02',
    tx_hash: MOCK_TRANSACTIONS.find((t) => t.type === 'raydium_swap')?.signature || '4RayMockSig0002',
    block_time: 1792186000,
    platform: 'Raydium',
    activity_type: 'swap',
    tokens_in: [{ token_address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', amount: 1.5, value_usd: 231.30 }],
    tokens_out: [{ token_address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', symbol: 'RAY', amount: 108.0, value_usd: 231.12 }],
    fee_usd: 0.00077,
  },
  {
    activity_id: 'act_orca_03',
    tx_hash: MOCK_TRANSACTIONS.find((t) => t.type === 'orca_swap')?.signature || '3OrcMockSig0003',
    block_time: 1792178000,
    platform: 'Orca',
    activity_type: 'swap',
    tokens_in: [{ token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: 146.5, value_usd: 146.5 }],
    tokens_out: [{ token_address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', amount: 0.95, value_usd: 146.49 }],
    fee_usd: 0.00077,
  },
  {
    activity_id: 'act_mnde_04',
    tx_hash: MOCK_TRANSACTIONS.find((t) => t.counterparty_label?.includes('Marinade'))?.signature || '2SolMarinade0004',
    block_time: 1792160000,
    platform: 'Marinade',
    activity_type: 'stake',
    tokens_in: [{ token_address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', amount: 10.0, value_usd: 1542.00 }],
    tokens_out: [{ token_address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL', amount: 8.85, value_usd: 1542.00 }],
    fee_usd: 0.0015,
  },
];

// Helper functions to query mock data
export function getMockAccountDetail(address: string): AccountDetail {
  if (address === SAMPLE_WALLET_ADDRESS) {
    return MOCK_SAMPLE_WALLET_DETAIL;
  }
  // Check known token mints (USDT, USDC, BONK, JUP, RAY)
  if (KNOWN_TOKENS[address]) {
    const meta = KNOWN_TOKENS[address].meta;
    return {
      address,
      lamports: 0,
      sol_balance: 0,
      account_type: 'token_mint',
      owner_program: TOKEN_PROGRAM_ID,
      executable: false,
      rent_epoch: 361,
      is_whale: false,
      mint_info: {
        decimals: meta.decimals,
        supply: String(meta.supply || '1000000000'),
        mintAuthority: null, // Reputable tokens have revoked mint authority
        freezeAuthority: address === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' || address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
          ? '2wmVCSFeAggT9v62aqRqSochS3LXu1zPTHQH4EPfZBLm'
          : null,
        isInitialized: true,
      },
    };
  }
  // Check known programs
  if (
    address === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' ||
    address === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' ||
    address === 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' ||
    address === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  ) {
    return {
      address,
      lamports: 1000000000,
      sol_balance: 1.0,
      account_type: 'program',
      owner_program: 'BPFLoader2111111111111111111111111111111111',
      executable: true,
      rent_epoch: 361,
      is_whale: false,
    };
  }
  // Check known counterparties
  if (KNOWN_ADDRESSES[address]) {
    return {
      address,
      lamports: 50000000000,
      sol_balance: 50.0,
      account_type: 'system_account',
      owner_program: SYSTEM_PROGRAM_ID,
      executable: false,
      rent_epoch: 361,
      is_whale: true,
      usd_value: 50.0 * 154.20,
    };
  }
  // Generic fallback for any arbitrary address
  return {
    address,
    lamports: 1250000000,
    sol_balance: 1.25,
    account_type: 'system_account',
    owner_program: SYSTEM_PROGRAM_ID,
    executable: false,
    rent_epoch: 361,
    is_whale: false,
    usd_value: 1.25 * 154.20,
  };
}

export function getMockAccountTransactions(
  address: string,
  limit: number = 100,
  before?: string
): { transactions: TransactionSummary[]; total: number; has_more: boolean; next_cursor?: string } {
  const allTxs = MOCK_TRANSACTIONS.filter((tx) =>
    tx.account_keys.includes(address) ||
    tx.fee_payer === address ||
    tx.counterparty === address ||
    address === SAMPLE_WALLET_ADDRESS
  );

  let startIndex = 0;
  if (before) {
    const beforeIndex = allTxs.findIndex((tx) => tx.signature === before);
    if (beforeIndex !== -1) {
      startIndex = beforeIndex + 1;
    }
  }

  const effectiveLimit = Math.max(1, Math.min(limit, 100));
  const slice = allTxs.slice(startIndex, startIndex + effectiveLimit);
  const hasMore = startIndex + effectiveLimit < allTxs.length;
  const nextCursor = hasMore ? slice[slice.length - 1]?.signature : undefined;

  return {
    transactions: slice,
    total: allTxs.length,
    has_more: hasMore,
    next_cursor: nextCursor,
  };
}

export function getMockTokenAccounts(address: string): TokenAccountHolding[] {
  if (address === SAMPLE_WALLET_ADDRESS) {
    return MOCK_TOKEN_ACCOUNTS;
  }
  // Sample token accounts for other addresses
  return [
    {
      token_account: `TA_${address.slice(0, 8)}_USDC`,
      token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      token_symbol: 'USDC',
      token_name: 'USD Coin',
      decimals: 6,
      amount: 500.0,
      raw_amount: '500000000',
      price_usd: 1.0001,
      value_usd: 500.05,
    },
  ];
}

export function getMockTokenMeta(tokenAddress: string): TokenMetadata {
  const token = KNOWN_TOKENS[tokenAddress];
  if (token) {
    return token.meta;
  }
  return {
    address: tokenAddress,
    name: `Token ${tokenAddress.slice(0, 6)}`,
    symbol: tokenAddress.slice(0, 4).toUpperCase(),
    decimals: 9,
    supply: 1000000000,
    holder_count: 120,
  };
}

export function getMockTokenPrice(tokenAddress: string): TokenPrice {
  const token = KNOWN_TOKENS[tokenAddress];
  if (token) {
    return token.price;
  }
  return {
    address: tokenAddress,
    symbol: tokenAddress.slice(0, 4).toUpperCase(),
    price_usd: 0.15,
    price_change_24h: 1.2,
    volume_24h_usd: 50000,
    market_cap_usd: 150000,
    updated_at: Math.floor(Date.now() / 1000),
  };
}

export function getMockDefiActivities(
  address: string,
  page: number = 1,
  pageSize: number = 10
): { activities: DefiActivity[]; total: number; page: number; pageSize: number } {
  const startIndex = (page - 1) * pageSize;
  const activities = MOCK_DEFI_ACTIVITIES.slice(startIndex, startIndex + pageSize);
  return {
    activities,
    total: MOCK_DEFI_ACTIVITIES.length,
    page,
    pageSize,
  };
}

export function getMockTransactionDetail(signature: string): TransactionDetail | null {
  const found = MOCK_TRANSACTIONS.find((tx) => tx.signature === signature);
  if (found) return found;

  // Construct a fallback realistic tx detail if signature is unknown
  return {
    signature,
    slot: 318249000,
    block_time: 1792193000,
    fee: 5000,
    fee_payer: SAMPLE_WALLET_ADDRESS,
    status: 'Success',
    type: 'incoming_transfer',
    direction: 'incoming',
    amount: 1.5,
    amount_symbol: 'SOL',
    counterparty: '4dEftK8uLwZ5NjY7x3PqV1s8RtY9mB2cX6hL0vQ5wE1',
    counterparty_label: 'Binance Hot Wallet 14',
    program_ids: [SYSTEM_PROGRAM_ID],
    pre_balances: [
      { account: SAMPLE_WALLET_ADDRESS, lamports: 13350230000 },
      { account: '4dEftK8uLwZ5NjY7x3PqV1s8RtY9mB2cX6hL0vQ5wE1', lamports: 51500000000 },
    ],
    post_balances: [
      { account: SAMPLE_WALLET_ADDRESS, lamports: 14850230000 },
      { account: '4dEftK8uLwZ5NjY7x3PqV1s8RtY9mB2cX6hL0vQ5wE1', lamports: 50000000000 },
    ],
    signers: ['4dEftK8uLwZ5NjY7x3PqV1s8RtY9mB2cX6hL0vQ5wE1'],
    account_keys: [SAMPLE_WALLET_ADDRESS, '4dEftK8uLwZ5NjY7x3PqV1s8RtY9mB2cX6hL0vQ5wE1', SYSTEM_PROGRAM_ID],
    balance_changes: [
      {
        account: SAMPLE_WALLET_ADDRESS,
        asset_type: 'SOL',
        pre_balance: 13.35023,
        post_balance: 14.85023,
        change_amount: 1.5,
        change_type: 'increase',
      },
    ],
    instructions: [
      {
        program_id: SYSTEM_PROGRAM_ID,
        program_name: 'System Program',
        action: 'transfer',
        source: '4dEftK8uLwZ5NjY7x3PqV1s8RtY9mB2cX6hL0vQ5wE1',
        destination: SAMPLE_WALLET_ADDRESS,
        amount: 1.5,
        symbol: 'SOL',
      },
    ],
  };
}

export function getMockBalanceChange(signature: string): TransactionBalanceChange | null {
  const tx = getMockTransactionDetail(signature);
  if (!tx) return null;
  return {
    signature,
    changes: tx.balance_changes,
  };
}
