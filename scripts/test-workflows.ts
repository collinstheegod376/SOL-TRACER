/**
 * Solscan AI - End-to-End Workflow Integration Test Suite
 *
 * Verifies the 5 core scenarios defined in `work flow 5.txt`, `context.txt`, and project specs:
 *  - Scenario 1: Load active wallet & LOOKUP queries ("What's the SOL balance?", "What tokens does it hold?")
 *  - Scenario 2: ENRICHMENT query ("What's this portfolio worth?", Whale evaluation)
 *  - Scenario 3: AGGREGATION query ("Who does he receive money from frequently?")
 *  - Scenario 4: Multi-turn Follow-ups ("What about the last 500?" and "Who does he SEND to?")
 *  - Scenario 5: Error handling, rate limits, missing prices, & unlabeled addresses
 */

import { executeOrchestrator, classifyQuery } from '../lib/orchestrator';
import { mcpClient } from '../lib/mcp-client';
import { SAMPLE_WALLET_ADDRESS } from '../lib/mock-data';
import { labelAddress, formatAddress, KNOWN_LABELS, parseDexSwaps } from '../lib/analytics-engine';

interface TestResult {
  scenario: string;
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(scenario: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  process.stdout.write(`  ⏳ Running [${scenario}] ${name}... `);
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ scenario, name, passed: true, details: 'OK', durationMs });
    console.log(`\x1b[32mPASSED\x1b[0m (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const msg = err?.message || String(err);
    results.push({ scenario, name, passed: false, details: msg, durationMs });
    console.log(`\x1b[31mFAILED\x1b[0m (${durationMs}ms): ${msg}`);
  }
}

async function main() {
  console.log('\n================================================================');
  console.log('       SOLTRACE - WORKFLOW & INTEGRATION TEST RUNNER          ');
  console.log('================================================================\n');
  console.log(`Target Wallet: ${SAMPLE_WALLET_ADDRESS}`);
  console.log(`Client Mode:   ${mcpClient.getStatus().mode.toUpperCase()}\n`);

  // ============================================================================
  // SCENARIO 1: Load Wallet and LOOKUP Queries
  // ============================================================================
  console.log('\x1b[36m--- SCENARIO 1: Wallet Load & LOOKUP Queries ---\x1b[0m');

  await runTest('Scenario 1', 'Query Classification for Balance and Token Lookups', async () => {
    const classBal = classifyQuery("What's the SOL balance?");
    assert(classBal === 'LOOKUP', `Expected LOOKUP, got ${classBal}`);

    const classTokens = classifyQuery('What tokens does it hold?');
    assert(classTokens === 'LOOKUP', `Expected LOOKUP, got ${classTokens}`);

    const classTxs = classifyQuery('Show me the last 10 transactions');
    assert(classTxs === 'LOOKUP', `Expected LOOKUP, got ${classTxs}`);
  });

  await runTest('Scenario 1', 'SOL Balance Lookup Execution', async () => {
    const res = await executeOrchestrator({
      walletAddress: SAMPLE_WALLET_ADDRESS,
      message: "What's the SOL balance?",
    });

    assert(res.classification === 'LOOKUP', `Classification mismatch: ${res.classification}`);
    assert(res.toolCalls.length >= 1, 'Expected at least 1 tool call for LOOKUP');
    assert(res.toolCalls[0].tool === 'account_detail', `Expected account_detail tool call, got ${res.toolCalls[0].tool}`);
    assert(res.answer.includes('SOL'), 'Response should mention SOL');
    assert(res.answer.includes(formatAddress(SAMPLE_WALLET_ADDRESS, 4)), 'Response should contain shortened address');
    assert(res.structuredData?.type === 'lookup_balance', 'Expected structuredData type lookup_balance');
    assert(res.structuredData?.detail?.sol_balance !== undefined, 'SOL balance should be returned');
  });

  await runTest('Scenario 1', 'SPL Tokens Lookup Execution', async () => {
    const res = await executeOrchestrator({
      walletAddress: SAMPLE_WALLET_ADDRESS,
      message: 'What tokens does it hold?',
    });

    assert(res.classification === 'LOOKUP', `Expected LOOKUP, got ${res.classification}`);
    assert(res.toolCalls[0].tool === 'token_accounts', `Expected token_accounts tool, got ${res.toolCalls[0].tool}`);
    assert(res.structuredData?.type === 'lookup_tokens', 'Expected lookup_tokens');
    assert(Array.isArray(res.structuredData?.tokens?.tokens || res.structuredData?.tokens), 'Tokens array expected');
    assert(res.answer.includes('SPL tokens'), 'Answer should cite SPL tokens count');
  });

  // ============================================================================
  // SCENARIO 2: Ask an ENRICHMENT Query ("What's this portfolio worth?")
  // ============================================================================
  console.log('\n\x1b[36m--- SCENARIO 2: ENRICHMENT Query (Portfolio Valuation & Whale Check) ---\x1b[0m');

  await runTest('Scenario 2', 'Query Classification for Portfolio Worth', async () => {
    const classVal = classifyQuery("What's this portfolio worth?");
    assert(classVal === 'ENRICHMENT', `Expected ENRICHMENT, got ${classVal}`);

    const classWhale = classifyQuery('Is this a whale?');
    assert(classWhale === 'ENRICHMENT', `Expected ENRICHMENT, got ${classWhale}`);
  });

  await runTest('Scenario 2', 'Multi-tool Dispatch (account_detail + token_accounts + token_price)', async () => {
    const res = await executeOrchestrator({
      walletAddress: SAMPLE_WALLET_ADDRESS,
      message: "What's this wallet's portfolio worth?",
    });

    assert(res.classification === 'ENRICHMENT', `Expected ENRICHMENT classification, got ${res.classification}`);
    assert(res.toolCalls.length >= 3, `Expected at least 3 tool calls for enrichment, got ${res.toolCalls.length}`);
    
    const toolNames = res.toolCalls.map((t) => t.tool);
    assert(toolNames.includes('account_detail'), 'Should call account_detail');
    assert(toolNames.includes('token_accounts'), 'Should call token_accounts');
    assert(toolNames.includes('token_price'), 'Should call token_price');

    assert(res.structuredData?.type === 'enrichment', 'Structured data should be enrichment');
    const val = res.structuredData?.valuation;
    assert(val !== undefined, 'Valuation data must exist');
    assert(typeof val.totalUsdValue === 'number' && val.totalUsdValue > 0, 'Total USD value must be positive');
    assert(typeof val.isWhale === 'boolean', 'isWhale flag must be boolean');
    assert(res.answer.includes('Total Estimated Portfolio Value'), 'Answer must include direct valuation finding');
    assert(res.answer.includes('Whale Status'), 'Answer must present whale evaluation');
  });

  // ============================================================================
  // SCENARIO 3: AGGREGATION Query ("Who does he receive money from frequently?")
  // ============================================================================
  console.log('\n\x1b[36m--- SCENARIO 3: AGGREGATION Query (Counterparties & Inflow Flows) ---\x1b[0m');

  await runTest('Scenario 3', 'Classification for Frequent Inflow Query', async () => {
    const classification = classifyQuery('Who does he receive money from frequently?');
    assert(classification === 'AGGREGATION', `Expected AGGREGATION, got ${classification}`);
  });

  await runTest('Scenario 3', 'Transaction Aggregation, Grouping, Ranking & DEX Labeling', async () => {
    const res = await executeOrchestrator({
      walletAddress: SAMPLE_WALLET_ADDRESS,
      message: 'Who does he receive money from frequently?',
    });

    assert(res.classification === 'AGGREGATION', `Expected AGGREGATION, got ${res.classification}`);
    assert(res.toolCalls[0].tool === 'account_transactions', 'Must call account_transactions');
    assert(res.structuredData?.type === 'aggregation', 'Structured data must be aggregation');
    assert(res.structuredData?.direction === 'incoming', 'Direction must be detected as incoming');
    
    const ranked = res.structuredData?.rankedCounterparties;
    assert(Array.isArray(ranked) && ranked.length > 0, 'Must have ranked counterparties list');
    
    // Check ranking order (highest count first)
    if (ranked.length > 1) {
      assert(ranked[0].count >= ranked[1].count, 'Counterparties should be sorted in descending count order');
    }

    // Verify markdown table formatting and data scope per context.txt
    assert(res.answer.includes('Counterparty Breakdown'), 'Answer must contain Counterparty Breakdown header');
    assert(res.answer.includes('| Sender | Times | Total SOL | Avg SOL | Label |'), 'Must include formatted table headers');
    assert(res.answer.includes('Transactions Scanned:'), 'Must explicitly state transaction window scanned');
    assert(res.answer.includes('Limitations:'), 'Must note limitations honestly');
  });

  // ============================================================================
  // SCENARIO 4: Multi-Turn Follow-Up Queries
  // ============================================================================
  console.log('\n\x1b[36m--- SCENARIO 4: Multi-Turn Follow-Ups (Paginating & Direction Flipping) ---\x1b[0m');

  await runTest('Scenario 4', 'Follow-up Window Expansion: "What about the last 500?"', async () => {
    const conversationHistory = [
      { role: 'user' as const, content: 'Who does he receive money from frequently?' },
      {
        role: 'assistant' as const,
        content: 'The most frequent sender is 5tzF...Ai9 with 32 transactions. Scanned 100 transactions.',
      },
    ];

    const followUpRes = await executeOrchestrator({
      walletAddress: SAMPLE_WALLET_ADDRESS,
      message: 'What about the last 500?',
      history: conversationHistory,
    });

    assert(followUpRes.classification === 'AGGREGATION', `Expected AGGREGATION follow-up, got ${followUpRes.classification}`);
    assert(followUpRes.toolCalls[0].args.limit === 500, `Expected limit of 500 transactions, got ${followUpRes.toolCalls[0].args.limit}`);
    assert(followUpRes.structuredData?.totalScanned > 0, 'Total scanned should be greater than zero');
  });

  await runTest('Scenario 4', 'Follow-up Direction Flip: "Who does he SEND to?"', async () => {
    const conversationHistory = [
      { role: 'user' as const, content: 'Who does he receive money from frequently?' },
      {
        role: 'assistant' as const,
        content: 'Top sender is Binance. Scanned 100 transactions.',
      },
    ];

    const flipRes = await executeOrchestrator({
      walletAddress: SAMPLE_WALLET_ADDRESS,
      message: 'Who does he SEND to?',
      history: conversationHistory,
    });

    assert(flipRes.classification === 'AGGREGATION', `Expected AGGREGATION, got ${flipRes.classification}`);
    assert(flipRes.structuredData?.direction === 'outgoing', `Expected outgoing direction, got ${flipRes.structuredData?.direction}`);
    assert(flipRes.answer.includes('recipient'), 'Direct finding must refer to recipient');
    assert(flipRes.answer.includes('| Recipient | Times | Total SOL | Avg SOL | Label |'), 'Table header should be Recipient');
  });

  // ============================================================================
  // SCENARIO 5: Edge Cases, Error Handling, Rate Limits & Missing Data
  // ============================================================================
  console.log('\n\x1b[36m--- SCENARIO 5: Edge Cases, Rate Limits & Fallbacks ---\x1b[0m');

  await runTest('Scenario 5', 'Address Labeling: Known Programs vs Unlabeled Addresses', async () => {
    // Known DEX
    const jupLabel = labelAddress('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
    assert(jupLabel.includes('Jupiter'), `Expected Jupiter label, got ${jupLabel}`);

    // Known System Program
    const sysLabel = labelAddress('11111111111111111111111111111111');
    assert(sysLabel.includes('System Program'), `Expected System Program label, got ${sysLabel}`);

    // Unlabeled address
    const unkLabel = labelAddress('99999999999999999999999999999999999999999999');
    assert(unkLabel === 'Unlabeled', `Expected Unlabeled, got ${unkLabel}`);
  });

  await runTest('Scenario 5', 'Client Fallback & Transparent Warning Mode', async () => {
    // Verify client status
    const status = mcpClient.getStatus();
    assert(status.mode === 'mock' || status.mode === 'live', 'Status mode must be valid');

    // Tool execution produces warning or high-fidelity mock fallback data without crashing
    const toolExec = await mcpClient.callTool('account_detail', { address: SAMPLE_WALLET_ADDRESS });
    assert(toolExec.data !== undefined, 'Tool execution must return valid data structure');
    assert(typeof toolExec.durationMs === 'number', 'Duration in ms must be recorded');
  });

  await runTest('Scenario 5', 'Unknown Tool Exception Handling', async () => {
    let threw = false;
    try {
      await mcpClient.callTool('non_existent_tool_xyz', { foo: 'bar' });
    } catch {
      threw = true;
    }
    assert(threw, 'Calling a non-existent tool should safely throw');
  });

  // ============================================================================
  // SCENARIO 6: Advanced Intelligence (Conversational, Security, Flow Diagrams)
  // ============================================================================
  console.log('\n\x1b[36m--- SCENARIO 6: Advanced Intelligence & Conversational Chatbot ---\x1b[0m');

  await runTest('Scenario 6', 'Conversational Chatbot Greeting & Capabilities', async () => {
    const greetingRes = await executeOrchestrator({
      message: 'hi, how are you and what can you do?',
    });
    assert(greetingRes.classification === 'CONVERSATIONAL', `Expected CONVERSATIONAL, got ${greetingRes.classification}`);
    assert(greetingRes.answer.length > 20, 'Response should contain meaningful greeting');
    assert(greetingRes.answer.includes('SolTrace') || greetingRes.answer.includes('hello') || greetingRes.answer.includes('great'), 'Greeting should identify SolTrace');
  });

  await runTest('Scenario 6', 'Visual Money Flow Diagram Generation', async () => {
    const flowRes = await executeOrchestrator({
      walletAddress: SAMPLE_WALLET_ADDRESS,
      message: 'visualize money flow diagram',
    });
    assert(flowRes.classification === 'FLOW_DIAGRAM', `Expected FLOW_DIAGRAM, got ${flowRes.classification}`);
    assert(flowRes.answer.includes('mermaid'), 'Answer should contain Mermaid flowchart syntax');
    assert(flowRes.structuredData?.type === 'flow_diagram', 'Structured data type should be flow_diagram');
  });

  await runTest('Scenario 6', 'Wallet Security & Drainer Risk Audit', async () => {
    const secRes = await executeOrchestrator({
      walletAddress: SAMPLE_WALLET_ADDRESS,
      message: 'audit wallet security and check for drainers',
    });
    assert(secRes.classification === 'SECURITY_AUDIT', `Expected SECURITY_AUDIT, got ${secRes.classification}`);
    assert(secRes.answer.includes('Safety Score'), 'Answer should cite safety score');
    assert(secRes.structuredData?.audit?.score !== undefined, 'Audit score should be defined');
    assert(secRes.structuredData?.audit?.targetType === 'wallet', 'Target should be recognized as wallet');
  });

  await runTest('Scenario 6', 'Token Mint Contract Rug Risk Audit (Discrimination from Wallet)', async () => {
    const mintRes = await executeOrchestrator({
      walletAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT Mint
      message: 'audit security and check for rug pull risks',
    });
    assert(mintRes.classification === 'SECURITY_AUDIT', `Expected SECURITY_AUDIT, got ${mintRes.classification}`);
    assert(mintRes.structuredData?.audit?.targetType === 'token_mint', `Expected token_mint, got ${mintRes.structuredData?.audit?.targetType}`);
    assert(mintRes.answer.includes('Token Mint'), 'Answer must explicitly state target is an SPL Token Mint');
    assert(mintRes.answer.includes('Mint Authority'), 'Audit must evaluate Mint Authority');
    assert(mintRes.answer.includes('Freeze Authority'), 'Audit must evaluate Freeze Authority');
  });

  await runTest('Scenario 6', 'DEX Swap Real Amount Calculations (No 0.5 SOL Placeholders)', async () => {
    const mockSwapTx = {
      signature: '5xTestSwapSig1111111111111111111111111111111111111111111111111111111111111111111111111111',
      account_keys: [SAMPLE_WALLET_ADDRESS, '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'],
      pre_balances: [15000000000, 1000000000],
      post_balances: [12500000000, 3500000000], // Exactly 2.5 SOL spent!
      token_transfers: [
        {
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
          amount: 385.5,
          direction: 'incoming',
          counterparty: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        },
      ],
    };
    const swaps = parseDexSwaps([mockSwapTx], SAMPLE_WALLET_ADDRESS);
    assert(swaps.length === 1, 'Should decode 1 swap');
    assert(swaps[0].inAmount === 2.5, `Expected 2.5 SOL, got ${swaps[0].inAmount}`);
    assert(swaps[0].inToken === 'SOL', `Expected inToken SOL, got ${swaps[0].inToken}`);
    assert(swaps[0].outAmount === 385.5, `Expected 385.5 USDC, got ${swaps[0].outAmount}`);
    assert(swaps[0].outToken === 'USDC', `Expected outToken USDC, got ${swaps[0].outToken}`);
  });

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log('\n================================================================');
  console.log('                    INTEGRATION TEST SUMMARY                    ');
  console.log('================================================================\n');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  for (const r of results) {
    const statusIcon = r.passed ? '\x1b[32m✔ PASS\x1b[0m' : '\x1b[31m✖ FAIL\x1b[0m';
    console.log(` ${statusIcon} [${r.scenario}] ${r.name} (${r.durationMs}ms)`);
    if (!r.passed) {
      console.log(`     Error: ${r.details}`);
    }
  }

  console.log(`\nTotal: ${total} | Passed: \x1b[32m${passed}\x1b[0m | Failed: ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '0'}`);

  if (failed > 0) {
    console.error('\n❌ INTEGRATION TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n\x1b[32m✔ ALL WORKFLOW INTEGRATION TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
