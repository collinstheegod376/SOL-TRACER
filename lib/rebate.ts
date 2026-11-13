import fs from "fs";
import path from "path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

export const RENT_RESERVE = 1_100_000;
export const NETWORK_FEE = 5_000;

export type Payout = {
  id: string;
  wallet: string;
  lamports: string;
  status: "pending" | "sent" | "failed";
  signature: string;
  error: string;
  createdAt: string;
  sentAt: string;
};

function dataFile() {
  return path.join(process.cwd(), "data", "payouts.json");
}

function readPayouts(): Payout[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile(), "utf8")) as { payouts?: Payout[] };
    return Array.isArray(parsed.payouts) ? parsed.payouts : [];
  } catch {
    return [];
  }
}

function writePayouts(payouts: Payout[]) {
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ payouts }, null, 2));
}

export function solToLamports(sol: string): bigint {
  const trimmed = sol.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Enter a SOL amount.");
  const [whole, frac = ""] = trimmed.split(".");
  const padded = (frac + "000000000").slice(0, 9);
  const lamports = BigInt(whole || "0") * BigInt(LAMPORTS_PER_SOL) + BigInt(padded);
  if (lamports <= 0n) throw new Error("Enter a SOL amount.");
  return lamports;
}

export function formatSol(lamports: bigint): string {
  const negative = lamports < 0n;
  const value = negative ? -lamports : lamports;
  const whole = value / BigInt(LAMPORTS_PER_SOL);
  const frac = (value % BigInt(LAMPORTS_PER_SOL)).toString().padStart(9, "0").replace(/0+$/, "");
  const text = frac ? `${whole}.${frac}` : `${whole}`;
  return negative ? `-${text}` : text;
}

function loadVault(): Keypair {
  const fromEnv = process.env.VAULT_SECRET_KEY?.trim();
  if (fromEnv) {
    const secret = JSON.parse(fromEnv) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  }
  const file = path.join(process.cwd(), "keys", "vault.json");
  const secret = JSON.parse(fs.readFileSync(file, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function rpcUrl() {
  return process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";
}

function connection() {
  return new Connection(rpcUrl(), "confirmed");
}

export function assertWallet(wallet: string): string {
  const trimmed = wallet.trim();
  const key = new PublicKey(trimmed);
  return key.toBase58();
}

export async function vaultView() {
  const vault = loadVault();
  const balance = BigInt(await connection().getBalance(vault.publicKey, "confirmed"));
  const payouts = readPayouts();
  const pending = payouts.filter((row) => row.status === "pending");
  const reserved = pending.reduce((sum, row) => sum + BigInt(row.lamports), 0n);
  const fees = BigInt(pending.length) * BigInt(NETWORK_FEE);
  const spendable = balance - BigInt(RENT_RESERVE) - fees;
  return {
    address: vault.publicKey.toBase58(),
    balanceSol: formatSol(balance),
    spendableSol: formatSol(spendable > 0n ? spendable : 0n),
    pendingCount: pending.length,
    pendingSol: formatSol(reserved),
    mint: process.env.TOKEN_MINT?.trim() || "",
    payouts,
  };
}

export function payoutsFor(wallet: string): Payout[] {
  const address = assertWallet(wallet);
  return readPayouts().filter((row) => row.wallet === address);
}

export function addPayout(wallet: string, sol: string): Payout {
  const address = assertWallet(wallet);
  const lamports = solToLamports(sol);
  const payouts = readPayouts();
  const row: Payout = {
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    wallet: address,
    lamports: lamports.toString(),
    status: "pending",
    signature: "",
    error: "",
    createdAt: new Date().toISOString(),
    sentAt: "",
  };
  payouts.unshift(row);
  writePayouts(payouts);
  return row;
}

export async function sendPayout(id: string): Promise<Payout> {
  const payouts = readPayouts();
  const row = payouts.find((item) => item.id === id);
  if (!row) throw new Error("That payout does not exist.");
  if (row.status === "sent") return row;
  const vault = loadVault();
  const conn = connection();
  const balance = BigInt(await conn.getBalance(vault.publicKey, "confirmed"));
  const amount = BigInt(row.lamports);
  if (balance - amount - BigInt(NETWORK_FEE) < BigInt(RENT_RESERVE)) {
    throw new Error("The vault would drop below 0.0011 SOL. Nothing was sent.");
  }
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: vault.publicKey,
      toPubkey: new PublicKey(row.wallet),
      lamports: Number(amount),
    }),
  );
  try {
    const signature = await conn.sendTransaction(transaction, [vault], { preflightCommitment: "confirmed" });
    await conn.confirmTransaction(signature, "confirmed");
    row.status = "sent";
    row.signature = signature;
    row.error = "";
    row.sentAt = new Date().toISOString();
  } catch (error) {
    row.status = "failed";
    row.error = error instanceof Error ? error.message : "Send failed.";
    writePayouts(payouts);
    throw new Error(row.error);
  }
  writePayouts(payouts);
  return row;
}

export async function claimWallet(wallet: string): Promise<Payout> {
  const address = assertWallet(wallet);
  const pending = readPayouts().find((row) => row.wallet === address && row.status === "pending");
  if (!pending) throw new Error("No rebate is waiting for this wallet.");
  return sendPayout(pending.id);
}

export function vaultAddress(): string {
  return loadVault().publicKey.toBase58();
}

export async function vaultBalanceLamports(): Promise<bigint> {
  const vault = loadVault();
  return BigInt(await connection().getBalance(vault.publicKey, "confirmed"));
}

export function sentLamportsByWallet(): Record<string, string> {
  const totals = new Map<string, bigint>();
  for (const row of readPayouts()) {
    if (row.status !== "sent") continue;
    totals.set(row.wallet, (totals.get(row.wallet) ?? 0n) + BigInt(row.lamports));
  }
  return Object.fromEntries([...totals].map(([wallet, lamports]) => [wallet, lamports.toString()]));
}

export function recordTransfer(input: {
  wallet: string;
  lamports: bigint;
  signature: string;
  status: "sent" | "failed";
  error?: string;
}) {
  const payouts = readPayouts();
  payouts.unshift({
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    wallet: assertWallet(input.wallet),
    lamports: input.lamports.toString(),
    status: input.status,
    signature: input.signature,
    error: input.error ?? "",
    createdAt: new Date().toISOString(),
    sentAt: input.status === "sent" ? new Date().toISOString() : "",
  });
  writePayouts(payouts);
}
