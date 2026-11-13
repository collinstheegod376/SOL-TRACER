import fs from "fs";
import path from "path";
import { formatSol, sentLamportsByWallet, vaultAddress } from "@/lib/rebate";
import { scanSellers, type ScanMeta, type ScanRow, type SkippedRow } from "@/lib/scan";

export type RowStatus = "eligible" | "claimed" | "sent";

export type SnapshotRow = ScanRow & {
  status: RowStatus;
  claimedAt: string;
  signature: string;
};

export type SnapshotFile = ScanMeta & {
  rows: SnapshotRow[];
  skipped: SkippedRow[];
};

export type SnapshotRowView = SnapshotRow & {
  dueLamports: string;
  sentLamports: string;
};

export type SnapshotView = Omit<SnapshotFile, "rows"> & {
  rows: SnapshotRowView[];
  dueCount: number;
  dueLamports: string;
};

function filePath() {
  return path.join(process.cwd(), "data", "snapshot.json");
}

function readFile(): SnapshotFile | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), "utf8")) as SnapshotFile;
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeFile(snapshot: SnapshotFile) {
  const file = filePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
}

function decorate(snapshot: SnapshotFile, sent: Record<string, string>): SnapshotView {
  let due = 0n;
  let dueCount = 0;
  const rows = snapshot.rows.map((row) => {
    const paid = BigInt(sent[row.wallet] ?? "0");
    const rebate = BigInt(row.rebateLamports);
    const owing = rebate > paid ? rebate - paid : 0n;
    if (row.status !== "sent" && owing > 0n) {
      due += owing;
      dueCount += 1;
    }
    return { ...row, dueLamports: owing.toString(), sentLamports: paid.toString() };
  });
  return { ...snapshot, rows, dueCount, dueLamports: due.toString() };
}

export function snapshotView(): SnapshotView | null {
  const snapshot = readFile();
  if (!snapshot) return null;
  return decorate(snapshot, sentLamportsByWallet());
}

export async function takeSnapshot(): Promise<SnapshotView> {
  const previous = readFile();
  const sent = sentLamportsByWallet();
  const scanned = await scanSellers(sent, vaultAddress());
  const previousByWallet = new Map((previous?.rows ?? []).map((row) => [row.wallet, row]));
  const rows: SnapshotRow[] = scanned.rows.map((row) => {
    const old = previousByWallet.get(row.wallet);
    const paid = BigInt(sent[row.wallet] ?? "0");
    const rebate = BigInt(row.rebateLamports);
    let status: RowStatus = "eligible";
    let claimedAt = "";
    let signature = old?.signature ?? "";
    if (paid >= rebate && paid > 0n) {
      status = "sent";
      claimedAt = old?.claimedAt ?? "";
    } else if (old?.status === "claimed" || old?.status === "sent") {
      status = "claimed";
      claimedAt = old.claimedAt;
    }
    return { ...row, status, claimedAt, signature };
  });

  for (const old of previous?.rows ?? []) {
    if (old.status !== "sent") continue;
    if (rows.some((row) => row.wallet === old.wallet)) continue;
    rows.push(old);
  }

  const snapshot: SnapshotFile = { ...scanned.meta, rows, skipped: scanned.skipped };
  writeFile(snapshot);
  return decorate(snapshot, sent);
}

export function lookupWallet(wallet: string) {
  const snapshot = readFile();
  const row = snapshot?.rows.find((item) => item.wallet === wallet);
  if (!row) {
    return { eligible: false, status: "not_eligible" as const, sol: "", lossSol: "", message: "Not eligible.", signature: "" };
  }
  const sol = formatSol(BigInt(row.rebateLamports));
  const lossSol = formatSol(BigInt(row.lossLamports));
  if (row.status === "sent") {
    return { eligible: true, status: row.status, sol, lossSol, message: "This rebate was sent.", signature: row.signature };
  }
  if (row.status === "claimed") {
    return { eligible: true, status: row.status, sol, lossSol, message: "You will receive it soon.", signature: "" };
  }
  return { eligible: true, status: row.status, sol, lossSol, message: "Eligible.", signature: "" };
}

export function markClaimed(wallet: string) {
  const snapshot = readFile();
  if (!snapshot) {
    return { eligible: false, status: "not_eligible" as const, sol: "", lossSol: "", message: "Not eligible.", signature: "" };
  }
  const row = snapshot.rows.find((item) => item.wallet === wallet);
  if (!row) {
    return { eligible: false, status: "not_eligible" as const, sol: "", lossSol: "", message: "Not eligible.", signature: "" };
  }
  if (row.status === "eligible") {
    row.status = "claimed";
    row.claimedAt = new Date().toISOString();
    try {
      writeFile(snapshot);
    } catch {
      return {
        eligible: true,
        status: "claimed" as const,
        sol: formatSol(BigInt(row.rebateLamports)),
        lossSol: formatSol(BigInt(row.lossLamports)),
        message: "You will receive it soon.",
        signature: "",
      };
    }
  }
  return lookupWallet(wallet);
}

export function markSent(updates: Array<{ wallet: string; signature: string }>) {
  const snapshot = readFile();
  if (!snapshot || updates.length === 0) return snapshotView();
  const byWallet = new Map(updates.map((update) => [update.wallet, update.signature]));
  for (const row of snapshot.rows) {
    const signature = byWallet.get(row.wallet);
    if (!signature) continue;
    row.status = "sent";
    row.signature = signature;
    if (!row.claimedAt) row.claimedAt = new Date().toISOString();
  }
  writeFile(snapshot);
  return snapshotView();
}
