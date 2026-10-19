import { executeOrchestrator, classifyQuery } from '../lib/orchestrator';

async function testOrchestrator() {
  console.log('--- Testing Query Classification ---');
  console.log('1. "tell me about $PEPE":', classifyQuery('tell me about $PEPE'));
  console.log('2. "is it bundled?":', classifyQuery('is it bundled?'));
  console.log('3. "did dev dump or hold?":', classifyQuery('did dev dump or hold?'));
  console.log('4. "tell me about CzLSujWBLFsSjncfkh59rQD4PpHC228h3gkHx9814464":', classifyQuery('tell me about CzLSujWBLFsSjncfkh59rQD4PpHC228h3gkHx9814464'));

  console.log('\n--- Testing Orchestration Result for "$GOAT" ---');
  const res = await executeOrchestrator({
    message: 'tell me about $GOAT',
  });

  console.log('Engine used:', res.engineUsed);
  console.log('Classification:', res.classification);
  console.log('Tool calls made:', res.toolCalls.length, res.toolCalls[0]?.resultSummary);
  console.log('Structured token symbol:', res.structuredData?.tokenReport?.intel?.symbol);
  console.log('Structured dev status:', res.structuredData?.tokenReport?.dev?.devStatus);
  console.log('Structured isBundled:', res.structuredData?.tokenReport?.bundle?.isBundled);
  console.log('\nResponse snippet:\n', res.answer.slice(0, 300) + '...');

  console.log('\n✅ Orchestrator token intelligence test completed successfully!');
}

testOrchestrator().catch(console.error);
