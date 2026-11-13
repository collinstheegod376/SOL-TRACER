const LAMPORTS = 1_000_000_000n;
const MIN_LOSS_CENTS = 500n;
const CAP_CENTS = 10_000n;
const DUST_LAMPORTS = 5_000_000n;

const SWAP_SOURCES = new Set([
  "PUMP_FUN",
  "PUMP_AMM",
  "JUPITER",
  "RAYDIUM",
  "ORCA",
  "METEORA",
  "PHOENIX",
]);

export type ScanRow = {
  wallet: string;
  lossLamports: string;
  buyLamports: string;
  rebateLamports: string;
  lossUsd: string;
  rebateUsd: string;
  holdSeconds: number;
  sells: number;
  buys: number;
  note: string;
};

export type SkippedRow = {
  wallet: string;
  reason: string;
  lossLamports: string;
  holdSeconds: number;
};

export type ScanMeta = {
  takenAt: string;
  mint: string;
  solPriceUsd: string;
  txCount: number;
  swapCount: number;
  truncated: boolean;
  rules: {
    minHoldSeconds: number;
    minLossUsd: number;
    lifetimeCapUsd: number;
    spendFraction: number;
    dustLamports: string;
  };
};

type HeliusTokenChange = {
  userAccount?: string;
  mint?: string;
  rawTokenAmount?: { tokenAmount?: string };
};

type HeliusAccount = {
  account?: string;
  nativeBalanceChange?: number;
  tokenBalanceChanges?: HeliusTokenChange[];
};

type HeliusTx = {
  type?: string;
  source?: string;
  fee?: number;
  feePayer?: string;
  signature?: string;
  timestamp?: number;
  accountData?: HeliusAccount[];
};

type Side = "buy" | "sell";

type SwapEvent = {
  ts: number;
  wallet: string;
  side: Side;
  tokenRaw: bigint;
  solLamports: bigint;
};

type Lot = { raw: bigint; cost: bigint; ts: number };

type Acc = {
  lots: Lot[];
  buyLamports: bigint;
  lossLamports: bigint;
  buys: number;
  sells: number;
  gainSells: number;
  holdSeconds: number;
};

function rules() {
  return {
    minHoldSeconds: 0,
    minLossUsd: 5,
    lifetimeCapUsd: 100,
    spendFraction: 0.5,
    dustLamports: DUST_LAMPORTS.toString(),
  };
}

function centsToUsd(cents: bigint): string {
  const whole = cents / 100n;
  const frac = (cents % 100n).toString().padStart(2, "0");
  return `${whole}.${frac}`;
}

function lamportsToCents(lamports: bigint, solPriceCents: bigint): bigint {
  return (lamports * solPriceCents) / LAMPORTS;
}

function centsToLamports(cents: bigint, solPriceCents: bigint): bigint {
  return (cents * LAMPORTS) / solPriceCents;
}

function tokenDelta(tx: HeliusTx, wallet: string, mint: string): bigint | null {
  let total = 0n;
  let seen = false;
  for (const account of tx.accountData ?? []) {
    for (const change of account.tokenBalanceChanges ?? []) {
      if (change.mint !== mint || change.userAccount !== wallet) continue;
      if (change.rawTokenAmount?.tokenAmount === undefined) continue;
      total += BigInt(change.rawTokenAmount.tokenAmount);
      seen = true;
    }
  }
  return seen ? total : null;
}

function nativeDelta(tx: HeliusTx, wallet: string): bigint | null {
  const row = tx.accountData?.find((account) => account.account === wallet);
  if (!row || row.nativeBalanceChange === undefined || row.nativeBalanceChange === null) return null;
  return BigInt(Math.trunc(row.nativeBalanceChange));
}

function readEvents(txs: HeliusTx[], mint: string, vault: string): SwapEvent[] {
  const events: SwapEvent[] = [];
  for (const tx of txs) {
    // UNKNOWN still counts for Pump and the DEXes. Helius sometimes labels a real fill that way.
    const counted = tx.type === "SWAP" || tx.type === "UNKNOWN";
    if (!counted || !tx.source || !SWAP_SOURCES.has(tx.source)) continue;
    const wallet = tx.feePayer || "";
    if (!wallet || wallet === vault || !tx.timestamp) continue;
    const delta = tokenDelta(tx, wallet, mint);
    const native = nativeDelta(tx, wallet);
    if (delta === null || delta === 0n || native === null) continue;
    const fee = BigInt(Math.trunc(tx.fee ?? 0));
    if (delta > 0n) {
      // nativeBalanceChange already includes the network fee. Remove it so the fee is not part of the fill.
      const cost = -native - fee;
      if (cost <= 0n) continue;
      events.push({ ts: tx.timestamp, wallet, side: "buy", tokenRaw: delta, solLamports: cost });
    } else {
      const proceeds = native + fee;
      if (proceeds <= 0n) continue;
      events.push({ ts: tx.timestamp, wallet, side: "sell", tokenRaw: -delta, solLamports: proceeds });
    }
  }
  events.sort((a, b) => a.ts - b.ts || (a.side === b.side ? 0 : a.side === "buy" ? -1 : 1));
  return events;
}

function emptyAcc(): Acc {
  return {
    lots: [],
    buyLamports: 0n,
    lossLamports: 0n,
    buys: 0,
    sells: 0,
    gainSells: 0,
    holdSeconds: 0,
  };
}

function applySell(acc: Acc, sold: bigint, proceeds: bigint, sellTs: number) {
  let need = sold;
  let matchedCost = 0n;
  let matchedRaw = 0n;
  let hold = 0;
  while (need > 0n && acc.lots.length > 0) {
    const lot = acc.lots[0];
    const take = lot.raw <= need ? lot.raw : need;
    const usedCost = take === lot.raw ? lot.cost : (lot.cost * take) / lot.raw;
    const held = sellTs - lot.ts;
    if (held > hold) hold = held;
    matchedCost += usedCost;
    matchedRaw += take;
    lot.raw -= take;
    lot.cost -= usedCost;
    need -= take;
    if (lot.raw === 0n) acc.lots.shift();
  }
  acc.sells += 1;
  if (matchedRaw === 0n) return;
  const eligibleProceeds = (proceeds * matchedRaw) / sold;
  if (eligibleProceeds < matchedCost) {
    acc.lossLamports += matchedCost - eligibleProceeds;
    if (hold > acc.holdSeconds) acc.holdSeconds = hold;
  } else {
    acc.gainSells += 1;
  }
}

function settle(events: SwapEvent[], solPriceCents: bigint, alreadySent: Record<string, string>) {
  const byWallet = new Map<string, Acc>();
  for (const event of events) {
    const acc = byWallet.get(event.wallet) ?? emptyAcc();
    if (event.side === "buy") {
      acc.lots.push({ raw: event.tokenRaw, cost: event.solLamports, ts: event.ts });
      acc.buyLamports += event.solLamports;
      acc.buys += 1;
    } else {
      applySell(acc, event.tokenRaw, event.solLamports, event.ts);
    }
    byWallet.set(event.wallet, acc);
  }

  const rows: ScanRow[] = [];
  const skipped: SkippedRow[] = [];
  for (const [wallet, acc] of byWallet) {
    if (acc.sells === 0) continue;
    const base = {
      wallet,
      lossLamports: acc.lossLamports.toString(),
      holdSeconds: acc.holdSeconds,
    };
    if (acc.lossLamports === 0n) {
      let reason = "Sold for a gain";
      if (acc.buys === 0 || acc.gainSells === 0) reason = "No matching buy";
      skipped.push({ ...base, reason });
      continue;
    }

    const lossCents = lamportsToCents(acc.lossLamports, solPriceCents);
    if (lossCents < MIN_LOSS_CENTS) {
      skipped.push({ ...base, reason: "Loss under $5" });
      continue;
    }

    const already = BigInt(alreadySent[wallet] ?? "0");
    const alreadyCents = lamportsToCents(already, solPriceCents);
    const roomCents = CAP_CENTS > alreadyCents ? CAP_CENTS - alreadyCents : 0n;
    const roomLamports = centsToLamports(roomCents, solPriceCents);
    const halfLamports = acc.buyLamports / 2n;
    let rebateLamports = acc.lossLamports;
    let note = "";
    if (halfLamports < rebateLamports) {
      rebateLamports = halfLamports;
      note = "Capped at half the SOL spent buying";
    }
    if (roomLamports < rebateLamports) {
      rebateLamports = roomLamports;
      note = "Capped at $100";
    }
    if (rebateLamports <= 0n) {
      skipped.push({ ...base, reason: "Already at the $100 cap" });
      continue;
    }
    if (rebateLamports < DUST_LAMPORTS) {
      skipped.push({ ...base, reason: "Rebate under 0.005 SOL" });
      continue;
    }

    rows.push({
      wallet,
      lossLamports: acc.lossLamports.toString(),
      buyLamports: acc.buyLamports.toString(),
      rebateLamports: rebateLamports.toString(),
      lossUsd: centsToUsd(lossCents),
      rebateUsd: centsToUsd(lamportsToCents(rebateLamports, solPriceCents)),
      holdSeconds: acc.holdSeconds,
      sells: acc.sells,
      buys: acc.buys,
      note,
    });
  }

  rows.sort((a, b) => (BigInt(a.rebateLamports) < BigInt(b.rebateLamports) ? 1 : -1));
  skipped.sort((a, b) => (BigInt(a.lossLamports) < BigInt(b.lossLamports) ? 1 : -1));
  return { rows, skipped };
}

async function solPriceCents(): Promise<bigint> {
  const attempts: Array<() => Promise<number | null>> = [
    async () => {
      const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT", { cache: "no-store" });
      if (!response.ok) return null;
      const body = (await response.json()) as { price?: string };
      const price = Number(body.price);
      return Number.isFinite(price) && price > 0 ? price : null;
    },
    async () => {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
        cache: "no-store",
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { solana?: { usd?: number } };
      const price = body.solana?.usd;
      return typeof price === "number" && price > 0 ? price : null;
    },
  ];
  for (const attempt of attempts) {
    try {
      const price = await attempt();
      if (price) return BigInt(Math.round(price * 100));
    } catch {
      // The next price source is tried.
    }
  }
  throw new Error("Could not read the SOL price. The snapshot was not saved.");
}

async function heliusPage(mint: string, apiKey: string, before: string): Promise<HeliusTx[]> {
  const url = new URL(`https://api.helius.xyz/v0/addresses/${mint}/transactions`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("limit", "100");
  if (before) url.searchParams.set("before", before);
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const retry = await fetch(url, { cache: "no-store" });
    if (!retry.ok) throw new Error(`Helius returned ${retry.status}. The snapshot was not saved.`);
    const body = (await retry.json()) as unknown;
    if (!Array.isArray(body)) throw new Error("Helius did not return transactions. The snapshot was not saved.");
    return body as HeliusTx[];
  }
  if (!response.ok) throw new Error(`Helius returned ${response.status}. The snapshot was not saved.`);
  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) throw new Error("Helius did not return transactions. The snapshot was not saved.");
  return body as HeliusTx[];
}

async function loadHistory(mint: string, apiKey: string) {
  const seen = new Set<string>();
  const txs: HeliusTx[] = [];
  let before = "";
  let truncated = false;
  for (let page = 0; page < 100; page += 1) {
    const batch = await heliusPage(mint, apiKey, before);
    if (batch.length === 0) break;
    for (const tx of batch) {
      if (!tx.signature || seen.has(tx.signature)) continue;
      seen.add(tx.signature);
      txs.push(tx);
    }
    if (batch.length < 100) break;
    const next = batch[batch.length - 1]?.signature || "";
    if (!next || next === before) break;
    before = next;
    if (page === 99) truncated = true;
  }
  return { txs, truncated };
}

export async function scanSellers(alreadySent: Record<string, string>, vault: string) {
  const mint = process.env.TOKEN_MINT?.trim() || "";
  const apiKey = process.env.HELIUS_API_KEY?.trim() || "";
  if (!mint) throw new Error("TOKEN_MINT is not set.");
  if (!apiKey) throw new Error("HELIUS_API_KEY is not set.");

  const [{ txs, truncated }, solPrice] = await Promise.all([loadHistory(mint, apiKey), solPriceCents()]);
  const events = readEvents(txs, mint, vault);
  const { rows, skipped } = settle(events, solPrice, alreadySent);
  const meta: ScanMeta = {
    takenAt: new Date().toISOString(),
    mint,
    solPriceUsd: (Number(solPrice) / 100).toFixed(2),
    txCount: txs.length,
    swapCount: events.length,
    truncated,
    rules: rules(),
  };
  return { meta, rows, skipped };
}
