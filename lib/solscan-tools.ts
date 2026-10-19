/**
 * Solscan Tools Implementation
 *
 * Implements the 8 core Solscan tools used by Solscan AI:
 * 1. account_detail (SOL balance, account type, owner)
 * 2. account_transactions (paginated transaction history)
 * 3. token_accounts (SPL token holdings with USD value)
 * 4. token_meta (token metadata, name, symbol, decimals)
 * 5. token_price (current USD price, 24h change, volume)
 * 6. defi_activities (decoded DeFi swaps, LP, staking)
 * 7. transaction_detail (full detail for a single transaction)
 * 8. balance_change (net SOL & SPL balance changes in a transaction)
 */

import {
  AccountDetail,
  TokenAccountHolding,
  TokenMetadata,
  TokenPrice,
  TransactionSummary,
  TransactionDetail,
  TransactionBalanceChange,
  DefiActivity,
  getMockAccountDetail,
  getMockAccountTransactions,
  getMockTokenAccounts,
  getMockTokenMeta,
  getMockTokenPrice,
  getMockDefiActivities,
  getMockTransactionDetail,
  getMockBalanceChange,
} from './mock-data';

export type SolscanToolName =
  | 'account_detail'
  | 'account_transactions'
  | 'token_accounts'
  | 'token_meta'
  | 'token_price'
  | 'defi_activities'
  | 'transaction_detail'
  | 'balance_change';

export interface AccountDetailParams {
  address: string;
}

export interface AccountTransactionsParams {
  address: string;
  limit?: number;
  before?: string;
}

export interface AccountTransactionsResponse {
  address: string;
  transactions: TransactionSummary[];
  total: number;
  has_more: boolean;
  next_cursor?: string;
  data_window: string;
}

export interface TokenAccountsParams {
  address: string;
}

export interface TokenAccountsResponse {
  address: string;
  tokens: TokenAccountHolding[];
  total_token_value_usd: number;
}

export interface TokenMetaParams {
  token_address: string;
}

export interface TokenPriceParams {
  token_address: string;
}

export interface DefiActivitiesParams {
  address: string;
  page?: number;
  page_size?: number;
}

export interface DefiActivitiesResponse {
  address: string;
  activities: DefiActivity[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransactionDetailParams {
  signature: string;
}

export interface BalanceChangeParams {
  signature: string;
}

/**
 * Tool Definition Schema for LLM function calling and MCP server discovery
 */
export interface ToolDefinition {
  name: SolscanToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; default?: unknown }>;
    required: string[];
  };
}

export const SOLSCAN_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'account_detail',
    description: 'Retrieve SOL balance, lamports, account type, owner program, and rent info for a Solana address.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'The Solana wallet or account public key (Base58 string).' },
      },
      required: ['address'],
    },
  },
  {
    name: 'account_transactions',
    description: 'Retrieve paginated transaction history for a wallet, including pre/post balances, signatures, and counterparties.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'The Solana wallet address.' },
        limit: { type: 'number', description: 'Number of transactions to return (max 100, default 100).' },
        before: { type: 'string', description: 'Transaction signature cursor to paginate transactions before this point.' },
      },
      required: ['address'],
    },
  },
  {
    name: 'token_accounts',
    description: 'Retrieve all SPL token holdings for a Solana wallet, with amounts, decimals, symbols, and USD values.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'The Solana wallet address.' },
      },
      required: ['address'],
    },
  },
  {
    name: 'token_meta',
    description: 'Retrieve metadata for an SPL token, including name, symbol, decimals, icon URL, and supply.',
    parameters: {
      type: 'object',
      properties: {
        token_address: { type: 'string', description: 'The SPL token mint address.' },
      },
      required: ['token_address'],
    },
  },
  {
    name: 'token_price',
    description: 'Retrieve current and historical USD price, 24h volume, and 24h percentage change for a token mint.',
    parameters: {
      type: 'object',
      properties: {
        token_address: { type: 'string', description: 'The SPL token mint address.' },
      },
      required: ['token_address'],
    },
  },
  {
    name: 'defi_activities',
    description: 'Retrieve decoded DeFi actions (swaps, liquidity pool events, staking) for a wallet.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'The Solana wallet address.' },
        page: { type: 'number', description: 'Page index starting from 1.' },
        page_size: { type: 'number', description: 'Items per page (default 10).' },
      },
      required: ['address'],
    },
  },
  {
    name: 'transaction_detail',
    description: 'Retrieve comprehensive detail for a single transaction signature, including decoded instructions and signers.',
    parameters: {
      type: 'object',
      properties: {
        signature: { type: 'string', description: 'The base58 transaction signature.' },
      },
      required: ['signature'],
    },
  },
  {
    name: 'balance_change',
    description: 'Retrieve net balance changes (SOL and SPL tokens) for all accounts involved in a transaction signature.',
    parameters: {
      type: 'object',
      properties: {
        signature: { type: 'string', description: 'The base58 transaction signature.' },
      },
      required: ['signature'],
    },
  },
];

/**
 * 1. account_detail
 * Returns SOL balance, account type, owner program, executable status.
 */
export async function account_detail(
  params: AccountDetailParams | string
): Promise<AccountDetail> {
  const address = typeof params === 'string' ? params.trim() : params.address.trim();
  if (!address) {
    throw new Error('Address is required for account_detail');
  }
  return getMockAccountDetail(address);
}

/**
 * 2. account_transactions
 * Returns paginated transaction history for a wallet.
 */
export async function account_transactions(
  params: AccountTransactionsParams | string,
  limitArg?: number,
  beforeArg?: string
): Promise<AccountTransactionsResponse> {
  let address: string;
  let limit = 100;
  let before: string | undefined;

  if (typeof params === 'string') {
    address = params.trim();
    if (limitArg !== undefined) limit = limitArg;
    if (beforeArg !== undefined) before = beforeArg;
  } else {
    address = params.address.trim();
    if (params.limit !== undefined) limit = params.limit;
    if (params.before !== undefined) before = params.before;
  }

  if (!address) {
    throw new Error('Address is required for account_transactions');
  }

  const result = getMockAccountTransactions(address, limit, before);
  return {
    address,
    transactions: result.transactions,
    total: result.total,
    has_more: result.has_more,
    next_cursor: result.next_cursor,
    data_window: `Showing ${result.transactions.length} of ${result.total} transactions`,
  };
}

/**
 * 3. token_accounts
 * Returns all SPL token holdings for a wallet with USD values.
 */
export async function token_accounts(
  params: TokenAccountsParams | string
): Promise<TokenAccountsResponse> {
  const address = typeof params === 'string' ? params.trim() : params.address.trim();
  if (!address) {
    throw new Error('Address is required for token_accounts');
  }

  const tokens = getMockTokenAccounts(address);
  const totalValueUsd = tokens.reduce((acc, t) => acc + (t.value_usd || 0), 0);

  return {
    address,
    tokens,
    total_token_value_usd: Number(totalValueUsd.toFixed(2)),
  };
}

/**
 * 4. token_meta
 * Returns metadata for a token (name, symbol, decimals, supply).
 */
export async function token_meta(
  params: TokenMetaParams | string
): Promise<TokenMetadata> {
  const tokenAddress = typeof params === 'string' ? params.trim() : params.token_address.trim();
  if (!tokenAddress) {
    throw new Error('Token address is required for token_meta');
  }
  return getMockTokenMeta(tokenAddress);
}

/**
 * 5. token_price
 * Returns current and historical price for a token.
 */
export async function token_price(
  params: TokenPriceParams | string
): Promise<TokenPrice> {
  const tokenAddress = typeof params === 'string' ? params.trim() : params.token_address.trim();
  if (!tokenAddress) {
    throw new Error('Token address is required for token_price');
  }
  return getMockTokenPrice(tokenAddress);
}

/**
 * 6. defi_activities
 * Returns decoded DeFi actions (swaps, LP, stakes).
 */
export async function defi_activities(
  params: DefiActivitiesParams | string,
  pageArg?: number,
  pageSizeArg?: number
): Promise<DefiActivitiesResponse> {
  let address: string;
  let page = 1;
  let pageSize = 10;

  if (typeof params === 'string') {
    address = params.trim();
    if (pageArg !== undefined) page = pageArg;
    if (pageSizeArg !== undefined) pageSize = pageSizeArg;
  } else {
    address = params.address.trim();
    if (params.page !== undefined) page = params.page;
    if (params.page_size !== undefined) pageSize = params.page_size;
  }

  if (!address) {
    throw new Error('Address is required for defi_activities');
  }

  const result = getMockDefiActivities(address, page, pageSize);
  return {
    address,
    activities: result.activities,
    total: result.total,
    page: result.page,
    page_size: result.pageSize,
  };
}

/**
 * 7. transaction_detail
 * Returns full detail for a single transaction signature.
 */
export async function transaction_detail(
  params: TransactionDetailParams | string
): Promise<TransactionDetail> {
  const signature = typeof params === 'string' ? params.trim() : params.signature.trim();
  if (!signature) {
    throw new Error('Signature is required for transaction_detail');
  }
  const detail = getMockTransactionDetail(signature);
  if (!detail) {
    throw new Error(`Transaction with signature '${signature}' not found`);
  }
  return detail;
}

/**
 * 8. balance_change
 * Returns net balance changes within a transaction signature.
 */
export async function balance_change(
  params: BalanceChangeParams | string
): Promise<TransactionBalanceChange> {
  const signature = typeof params === 'string' ? params.trim() : params.signature.trim();
  if (!signature) {
    throw new Error('Signature is required for balance_change');
  }
  const changes = getMockBalanceChange(signature);
  if (!changes) {
    throw new Error(`Balance changes for signature '${signature}' not found`);
  }
  return changes;
}

/**
 * Generic tool dispatcher that invokes any of the 8 Solscan tools dynamically
 */
export async function executeSolscanTool(
  toolName: SolscanToolName | string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'account_detail':
      return account_detail(args as unknown as AccountDetailParams);
    case 'account_transactions':
      return account_transactions(args as unknown as AccountTransactionsParams);
    case 'token_accounts':
      return token_accounts(args as unknown as TokenAccountsParams);
    case 'token_meta':
      return token_meta(args as unknown as TokenMetaParams);
    case 'token_price':
      return token_price(args as unknown as TokenPriceParams);
    case 'defi_activities':
      return defi_activities(args as unknown as DefiActivitiesParams);
    case 'transaction_detail':
      return transaction_detail(args as unknown as TransactionDetailParams);
    case 'balance_change':
      return balance_change(args as unknown as BalanceChangeParams);
    default:
      throw new Error(`Unknown Solscan tool: ${toolName}`);
  }
}
