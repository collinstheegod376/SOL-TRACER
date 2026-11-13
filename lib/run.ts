import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { formatSol, NETWORK_FEE, recordTransfer, RENT_RESERVE, sentLamportsByWallet, vaultBalanceLamports } from "@/lib/rebate";
import { markSent, snapshotView } from "@/lib/snapshot";

const DUST = 5_000_000n;

function runPython(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn("python", args, { cwd: process.cwd(), windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function parseResults(stdout: string) {
  const results: Array<{ status: "sent" | "failed"; wallet: string; lamports: bigint; detail: string }> = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.startsWith("RESULT\t")) continue;
    const [, status, wallet, lamports, ...rest] = line.split("\t");
    if ((status !== "sent" && status !== "failed") || !wallet || !lamports) continue;
    results.push({ status, wallet, lamports: BigInt(lamports), detail: rest.join("\t") });
  }
  return results;
}

export async function runClaimedPayouts() {
  const snapshot = snapshotView();
  if (!snapshot) throw new Error("Take a snapshot first.");

  const sent = sentLamportsByWallet();
  const due: Array<{ wallet: string; lamports: bigint }> = [];
  for (const row of snapshot.rows) {
    if (row.status === "sent") continue;
    const paid = BigInt(sent[row.wallet] ?? "0");
    const rebate = BigInt(row.rebateLamports);
    const owing = rebate > paid ? rebate - paid : 0n;
    if (owing < DUST) continue;
    due.push({ wallet: row.wallet, lamports: owing });
  }
  if (due.length === 0) throw new Error("Nobody in the snapshot is waiting for SOL.");

  const balance = await vaultBalanceLamports();
  const total = due.reduce((sum, row) => sum + row.lamports, 0n);
  const fees = BigInt(due.length) * BigInt(NETWORK_FEE);
  const left = balance - total - fees;
  if (left < BigInt(RENT_RESERVE)) {
    const spendable = balance > BigInt(RENT_RESERVE) + fees ? balance - BigInt(RENT_RESERVE) - fees : 0n;
    throw new Error(
      `This run needs ${formatSol(total)} SOL. The vault can send ${formatSol(spendable)} SOL. Nothing was sent.`,
    );
  }

  const csvPath = path.join(process.cwd(), "data", "run.csv");
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  const lines = ["wallet,sol,lamports", ...due.map((row) => `${row.wallet},${formatSol(row.lamports)},${row.lamports}`)];
  fs.writeFileSync(csvPath, `${lines.join("\n")}\n`);

  const result = await runPython(["scripts/disburse.py", "data/run.csv", "--send"]);
  const parsed = parseResults(result.stdout);
  const sentUpdates: Array<{ wallet: string; signature: string }> = [];
  for (const row of parsed) {
    if (row.status === "sent") {
      recordTransfer({ wallet: row.wallet, lamports: row.lamports, signature: row.detail, status: "sent" });
      sentUpdates.push({ wallet: row.wallet, signature: row.detail });
    } else {
      recordTransfer({ wallet: row.wallet, lamports: row.lamports, signature: "", status: "failed", error: row.detail });
    }
  }
  const next = markSent(sentUpdates);
  if (result.code !== 0 && sentUpdates.length === 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || "The Python script failed.";
    throw new Error(detail);
  }
  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    sent: sentUpdates.length,
    snapshot: next,
  };
}
