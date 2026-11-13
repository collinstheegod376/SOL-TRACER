import { executeOrchestrator, classifyQuery, sanitizeLamports } from '../lib/orchestrator';

async function runTests() {
  console.log('========================================================');
  console.log('🚀 TESTING SOLTRACE 7 MAJOR FEATURES & LAMPORTS SANITIZER');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // TEST 0: Lamports Sanitization
  console.log('\n--- Test 0: Lamports Sanitization ---');
  const rawTextWithLamports = "— it's an uninitialized account with no lamports, holds 0 lamports, and has 14850230000 lamports.";
  const sanitized = sanitizeLamports(rawTextWithLamports);
  console.log('Raw:', rawTextWithLamports);
  console.log('Sanitized:', sanitized);
  assert(!sanitized.toLowerCase().includes('lamport'), 'Zero occurrences of "lamport" in sanitized output');
  assert(sanitized.includes('unfunded account with 0 SOL'), 'Replaced uninitialized with unfunded account');

  // TEST 1: Feature 1 - Proactive Risk Guardian (RISK_INTERCEPT)
  console.log('\n--- Test 1: Feature 1 - Proactive Risk Guardian ---');
  // Pass a query for a token that has unburned LP or active mint authority
  const res1 = await executeOrchestrator({
    message: 'tell me about CzLSujWBLFsSjncfkh59rQD4PpHC228h3gkHx9814464',
  });
  console.log('Classification:', res1.classification);
  console.log('Answer:', res1.answer);
  assert(res1.answer.length > 0, 'Returned non-empty answer');
  assert(!res1.answer.toLowerCase().includes('lamport'), 'Does not mention lamports');

  // TEST 2: Feature 2 - Rug Post-Mortem (RUG_POST_MORTEM)
  console.log('\n--- Test 2: Feature 2 - Rug Post-Mortem ---');
  const class2 = classifyQuery('what happened to $SCAM, did it rug?');
  assert(class2 === 'RUG_POST_MORTEM', `Classified as RUG_POST_MORTEM (got ${class2})`);
  const res2 = await executeOrchestrator({
    message: 'what happened to $SCAM, did it rug?',
  });
  console.log('Answer:', res2.answer);
  assert(res2.classification === 'RUG_POST_MORTEM', 'Orchestrator classification is RUG_POST_MORTEM');
  assert(res2.answer.includes('Post-Mortem') || res2.answer.includes('rug') || res2.answer.includes('liquidity'), 'Contains post-mortem analysis');
  assert(!res2.answer.toLowerCase().includes('lamport'), 'Does not mention lamports');

  // TEST 3: Feature 3 - Token Comparison (TOKEN_COMPARISON)
  console.log('\n--- Test 3: Feature 3 - CA vs CA Comparison ---');
  const class3 = classifyQuery('compare $WIF and $BONK');
  assert(class3 === 'TOKEN_COMPARISON', `Classified as TOKEN_COMPARISON (got ${class3})`);
  const res3 = await executeOrchestrator({
    message: 'compare $WIF and $BONK',
  });
  console.log('Answer:', res3.answer);
  assert(res3.classification === 'TOKEN_COMPARISON', 'Orchestrator classification is TOKEN_COMPARISON');
  assert(
    res3.answer.toLowerCase().includes('wif') ||
    res3.answer.toLowerCase().includes('bonk') ||
    res3.answer.toLowerCase().includes('comparison') ||
    res3.answer.toLowerCase().includes('vs'),
    'Contains comparison summary'
  );
  assert(!res3.answer.toLowerCase().includes('lamport'), 'Does not mention lamports');

  // TEST 4: Feature 4 - Narrative & Sector Rotation Tracker (SECTOR_TRACKER)
  console.log('\n--- Test 4: Feature 4 - Narrative & Sector Rotation Tracker ---');
  const class4 = classifyQuery('what is the hottest sector on Solana right now?');
  assert(class4 === 'SECTOR_TRACKER', `Classified as SECTOR_TRACKER (got ${class4})`);
  const res4 = await executeOrchestrator({
    message: 'what is the hottest sector right now?',
  });
  console.log('Answer:', res4.answer);
  assert(res4.classification === 'SECTOR_TRACKER', 'Orchestrator classification is SECTOR_TRACKER');
  assert(
    res4.answer.toLowerCase().includes('sector') ||
    res4.answer.toLowerCase().includes('rotation') ||
    res4.answer.toLowerCase().includes('narrative'),
    'Contains sector overview'
  );
  assert(!res4.answer.toLowerCase().includes('lamport'), 'Does not mention lamports');

  // TEST 5: Feature 5 - The "What-If" Simulator (INVESTMENT_SIMULATION)
  console.log('\n--- Test 5: Feature 5 - The "What-If" Simulator ---');
  const class5 = classifyQuery('what if I bought $500 of $GOAT at launch?');
  assert(class5 === 'INVESTMENT_SIMULATION', `Classified as INVESTMENT_SIMULATION (got ${class5})`);
  const res5 = await executeOrchestrator({
    message: 'what if I bought $500 of $GOAT at launch?',
  });
  console.log('Answer:', res5.answer);
  assert(res5.classification === 'INVESTMENT_SIMULATION', 'Orchestrator classification is INVESTMENT_SIMULATION');
  assert(res5.answer.includes('$500') || res5.answer.includes('ROI') || res5.answer.includes('worth'), 'Contains simulation calculation');
  assert(!res5.answer.toLowerCase().includes('lamport'), 'Does not mention lamports');

  // TEST 6: Feature 6 - Daily Briefing (DAILY_BRIEFING)
  console.log('\n--- Test 6: Feature 6 - Daily Briefing ---');
  const class6 = classifyQuery('gm what did I miss today?');
  assert(class6 === 'DAILY_BRIEFING', `Classified as DAILY_BRIEFING (got ${class6})`);
  const res6 = await executeOrchestrator({
    message: 'gm what did I miss today?',
  });
  console.log('Answer:', res6.answer);
  assert(res6.classification === 'DAILY_BRIEFING', 'Orchestrator classification is DAILY_BRIEFING');
  assert(
    res6.answer.toLowerCase().includes('gm') ||
    res6.answer.toLowerCase().includes('good morning') ||
    res6.answer.toLowerCase().includes('briefing') ||
    res6.answer.toLowerCase().includes('momentum') ||
    res6.answer.toLowerCase().includes('sol'),
    'Contains morning briefing'
  );
  assert(!res6.answer.toLowerCase().includes('lamport'), 'Does not mention lamports');

  // TEST 7: Feature 7 - Auto-Generated Alpha Threads (GENERATE_THREAD)
  console.log('\n--- Test 7: Feature 7 - Auto-Generated Alpha Threads ---');
  const class7 = classifyQuery('write a viral twitter thread for $GOAT');
  assert(class7 === 'GENERATE_THREAD', `Classified as GENERATE_THREAD (got ${class7})`);
  const res7 = await executeOrchestrator({
    message: 'write a twitter thread for $GOAT',
  });
  console.log('Answer:\n', res7.answer);
  assert(res7.classification === 'GENERATE_THREAD', 'Orchestrator classification is GENERATE_THREAD');
  assert(res7.answer.includes('🧵 1/4'), 'Contains thread part 1/4');
  assert(res7.answer.includes('2/4'), 'Contains thread part 2/4');
  assert(res7.answer.includes('3/4'), 'Contains thread part 3/4');
  assert(res7.answer.includes('4/4'), 'Contains thread part 4/4');
  assert(!res7.answer.toLowerCase().includes('lamport'), 'Does not mention lamports');

  console.log('\n========================================================');
  console.log(`🎉 TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
