import fs from "fs";
import path from "path";

type Row = {
  wallet: string;
  lossLamports: string;
  rebateLamports: string;
  status: "eligible" | "claimed" | "sent";
  claimedAt?: string;
  signature?: string;
};

type SnapshotFile = {
  rows?: Row[];
};

export type Eligibility = {
  eligible: boolean;
  status: "eligible" | "claimed" | "sent" | "not_eligible";
  sol: string;
  lossSol: string;
  message: string;
  signature: string;
};

function filePath() {
  return path.join(process.cwd(), "data", "snapshot.json");
}

function readRows(): Row[] | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), "utf8")) as SnapshotFile;
    return Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

function writeRows(rows: Row[]) {
  const file = filePath();
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as SnapshotFile;
  parsed.rows = rows;
  fs.writeFileSync(file, JSON.stringify(parsed, null, 2));
}

function sol(lamports: string) {
  const value = BigInt(lamports || "0");
  const whole = value / 1_000_000_000n;
  const frac = (value % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

function fromRow(row: Row): Eligibility {
  const amount = sol(row.rebateLamports);
  const lossSol = sol(row.lossLamports);
  if (row.status === "sent") {
    return { eligible: true, status: "sent", sol: amount, lossSol, message: "This rebate was sent.", signature: row.signature || "" };
  }
  if (row.status === "claimed") {
    return { eligible: true, status: "claimed", sol: amount, lossSol, message: "You will receive it soon.", signature: "" };
  }
  return { eligible: true, status: "eligible", sol: amount, lossSol, message: "Eligible.", signature: "" };
}

const notEligible: Eligibility = {
  eligible: false,
  status: "not_eligible",
  sol: "",
  lossSol: "",
  message: "Not eligible.",
  signature: "",
};

export function lookupEligibility(wallet: string): Eligibility {
  const rows = readRows();
  const row = rows?.find((item) => item.wallet === wallet);
  if (!row) return notEligible;
  return fromRow(row);
}

export function claimEligibility(wallet: string): Eligibility {
  const rows = readRows();
  if (!rows) return notEligible;
  const row = rows.find((item) => item.wallet === wallet);
  if (!row) return notEligible;
  if (row.status === "eligible") {
    row.status = "claimed";
    row.claimedAt = new Date().toISOString();
    try {
      writeRows(rows);
    } catch {
      return { ...fromRow(row), status: "claimed", message: "You will receive it soon." };
    }
  }
  return lookupEligibility(wallet);
}
