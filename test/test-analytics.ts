import { labelAddress, isKnownEntity, KNOWN_ENTITIES } from '../lib/labels';
import {
  filterIncomingSol,
  filterOutgoingSol,
  groupAndRankCounterparties,
  normalizeSol,
} from '../lib/onchain-analytics';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

console.log('--- 1. Testing lib/labels.ts ---');

// DEX Programs
const jup = labelAddress('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
assert(jup.category === 'dex' && jup.label.includes('Jupiter'), 'Jupiter DEX correctly labeled');

const ray = labelAddress('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
assert(ray.category === 'dex' && ray.label.includes('Raydium'), 'Raydium DEX correctly labeled');

const orca = labelAddress('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');
assert(orca.category === 'dex' && orca.label.includes('Orca'), 'Orca DEX correctly labeled');

const meteora = labelAddress('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');
assert(meteora.category === 'dex' && meteora.label.includes('Meteora'), 'Meteora DEX correctly labeled');

// System Program
const sys = labelAddress('11111111111111111111111111111111');
assert(sys.category === 'system' && sys.label === 'System Program', 'System Program correctly labeled');

// Token Program
const token = labelAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
assert(token.category === 'token' && token.label === 'Token Program', 'Token Program correctly labeled');

// CEX Hot Wallets
const binance = labelAddress('5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9');
assert(binance.category === 'cex' && binance.label.includes('Binance'), 'Binance hot wallet correctly labeled');

const coinbase = labelAddress('2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm');
assert(coinbase.category === 'cex' && coinbase.label.includes('Coinbase'), 'Coinbase hot wallet correctly labeled');

const kraken = labelAddress('FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5');
assert(kraken.category === 'cex' && kraken.label.includes('Kraken'), 'Kraken hot wallet correctly labeled');

const bybit = labelAddress('AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2');
assert(bybit.category === 'cex' && bybit.label.includes('Bybit'), 'Bybit hot wallet correctly labeled');

// Unlabeled user wallet
const unknownUser = labelAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
assert(unknownUser.category === 'user' && unknownUser.label === 'unlabeled', 'Unrecognized wallet correctly marked unlabeled');

console.log('\n--- 2. Testing lib/onchain-analytics.ts: filterIncomingSol ---');

const TARGET_WALLET = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const SENDER_A = '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9'; // Binance
const SENDER_B = '4dEfGH89vXyZ12345678901234567890123456789012'; // Unlabeled user
const SENDER_C = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'; // Jupiter

// Mock transactions
const mockTransactions = [
  // Tx 1: Binance sends 5 SOL to Target Wallet (using balance_entries)
  {
    signature: 'sig_1_binance_transfer',
    block_time: 1700000000,
    fee_payer: SENDER_A,
    balance_entries: [
      { account: SENDER_A, pre_balance: 100 * 1e9, post_balance: 95 * 1e9 },
      { account: TARGET_WALLET, pre_balance: 10 * 1e9, post_balance: 15 * 1e9 },
    ],
  },
  // Tx 2: User B sends 2.5 SOL to Target Wallet (target is fee payer in this claim tx)
  {
    signature: 'sig_2_user_transfer',
    block_time: 1700001000,
    fee_payer: TARGET_WALLET,
    balance_entries: [
      { account: SENDER_B, pre_balance: 20 * 1e9, post_balance: 17.5 * 1e9 },
      { account: TARGET_WALLET, pre_balance: 15 * 1e9, post_balance: 17.5 * 1e9 },
    ],
  },
  // Tx 3: Outgoing transfer (Target sends 3 SOL to SENDER_B) -> should be skipped by filterIncomingSol
  {
    signature: 'sig_3_outgoing',
    block_time: 1700002000,
    fee_payer: TARGET_WALLET,
    balance_entries: [
      { account: TARGET_WALLET, pre_balance: 17.5 * 1e9, post_balance: 14.5 * 1e9 },
      { account: SENDER_B, pre_balance: 17.5 * 1e9, post_balance: 20.5 * 1e9 },
    ],
  },
  // Tx 4: Solana RPC format transaction (Jupiter swap incoming 10 SOL)
  {
    signature: 'sig_4_rpc_format',
    blockTime: 1700003000,
    meta: {
      preBalances: [100 * 1e9, 14.5 * 1e9],
      postBalances: [90 * 1e9, 24.5 * 1e9],
    },
    transaction: {
      signatures: ['sig_4_rpc_format'],
      message: {
        accountKeys: [SENDER_C, TARGET_WALLET],
      },
    },
  },
];

const incoming = filterIncomingSol(TARGET_WALLET, mockTransactions);
assert(incoming.length === 3, 'filterIncomingSol found exactly 3 incoming transactions');
assert(incoming[0].counterparty === SENDER_A && incoming[0].delta === 5, 'Tx 1 has Binance as sender with 5 SOL');
assert(incoming[0].category === 'cex', 'Tx 1 counterparty category is cex');
assert(incoming[1].counterparty === SENDER_B && incoming[1].delta === 2.5, 'Tx 2 identifies debited account SENDER_B despite target being fee payer');
assert(incoming[1].category === 'user' && incoming[1].label === 'unlabeled', 'Tx 2 counterparty is unlabeled user');
assert(incoming[2].counterparty === SENDER_C && incoming[2].delta === 10, 'Tx 3 RPC format correctly parsed Jupiter swap of 10 SOL');
assert(incoming[2].category === 'dex', 'Tx 3 counterparty category is dex');

console.log('\n--- 3. Testing lib/onchain-analytics.ts: filterOutgoingSol ---');

const outgoing = filterOutgoingSol(TARGET_WALLET, mockTransactions);
assert(outgoing.length === 1, 'filterOutgoingSol found exactly 1 outgoing transaction');
assert(outgoing[0].counterparty === SENDER_B && outgoing[0].delta === 3, 'Outgoing recipient is SENDER_B with 3 SOL');

console.log('\n--- 4. Testing lib/onchain-analytics.ts: groupAndRankCounterparties ---');

// Add more flows to test ranking
const allFlows = [
  ...incoming,
  {
    counterparty: SENDER_A,
    delta: 1.0,
    signature: 'sig_5_binance_second',
    timestamp: 1700004000,
    direction: 'incoming' as const,
    walletAddress: TARGET_WALLET,
    label: 'Binance',
    category: 'cex' as const,
  },
  {
    counterparty: SENDER_A,
    delta: 2.0,
    signature: 'sig_6_binance_third',
    timestamp: 1700005000,
    direction: 'incoming' as const,
    walletAddress: TARGET_WALLET,
    label: 'Binance',
    category: 'cex' as const,
  },
];

// Test sort by 'count'
const rankedByCount = groupAndRankCounterparties(allFlows, 'count');
assert(rankedByCount.length === 3, 'Grouped 5 flows into 3 unique counterparties');
assert(rankedByCount[0].address === SENDER_A, 'Top counterparty by count is Binance (3 txs)');
assert(rankedByCount[0].count === 3, 'Binance count is 3');
assert(rankedByCount[0].totalSol === 8, 'Binance total SOL is 8 (5 + 1 + 2)');
assert(rankedByCount[0].avgSol === Number((8 / 3).toFixed(6)), 'Binance avgSol calculated correctly');

// Test sort by 'total'
const rankedByTotal = groupAndRankCounterparties(allFlows, 'total');
assert(rankedByTotal[0].address === SENDER_C, 'Top counterparty by total volume is Jupiter (10 SOL)');
assert(rankedByTotal[0].totalSol === 10, 'Jupiter totalSol is 10');
assert(rankedByTotal[1].address === SENDER_A && rankedByTotal[1].totalSol === 8, 'Second by volume is Binance (8 SOL)');

// Test table and chart structures
assert(Array.isArray(rankedByTotal.chartData), 'chartData is present and an array');
assert(rankedByTotal.chartData[0].value === 10, 'chartData value reflects sortBy=total');
assert(Array.isArray(rankedByTotal.tableData), 'tableData is present and an array');
assert(rankedByTotal.tableData[0].category === 'DEX', 'tableData maps dex to DEX');
assert(typeof rankedByTotal.markdownTable === 'string', 'markdownTable string is generated');
assert(rankedByTotal.markdownTable.includes('| Counterparty | Times | Total SOL |'), 'markdownTable has valid header');
assert(rankedByTotal.summary.uniqueCounterparties === 3, 'summary reports 3 unique counterparties');

console.log('\nGenerated Markdown Table:\n' + rankedByTotal.markdownTable);
console.log('\nAll tests passed successfully! 🎉');
