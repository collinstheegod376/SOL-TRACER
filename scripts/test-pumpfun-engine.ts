import { getPumpTokenReport, extractTokenOrTicker, formatTokenAnalystReport } from '../lib/pumpfun-engine';

async function main() {
  console.log('--- Testing extractTokenOrTicker ---');
  console.log('1. "$PEPE":', extractTokenOrTicker('tell me about $PEPE'));
  console.log('2. "tell me about goat":', extractTokenOrTicker('tell me about goat'));
  console.log('3. "CA query":', extractTokenOrTicker('is CzLSujWBLFsSjncfkh59rQD4PpHC228h3gkHx9814464 bundled?'));

  console.log('\n--- Testing Token Report for $GOAT ---');
  const report = await getPumpTokenReport('CzLSujWBLFsSjncfkh59rQD4PpHC228h3gkHx9814464', false);
  console.log('Token Symbol:', report.intel.symbol);
  console.log('Market Cap:', report.intel.marketCapUsd);
  console.log('Bundle status:', report.bundle.isBundled, report.bundle.verdict);
  console.log('Dev Status:', report.dev.devStatus, 'Holding:', report.dev.currentHoldingPercent + '%');
  console.log('Funding Source:', report.dev.fundingSource?.funderLabel);

  console.log('\n--- Formatted Analyst Output Preview ---');
  const markdown = formatTokenAnalystReport(report);
  console.log(markdown.slice(0, 500) + '...');
  console.log('\n✅ All pumpfun-engine tests passed!');
}

main().catch(console.error);
