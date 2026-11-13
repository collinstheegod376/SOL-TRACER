"use client";

import { useCallback, useEffect, useState } from "react";

export type Vault = {
  address: string;
  balanceSol: string;
  spendableSol: string;
  pendingCount: number;
  pendingSol: string;
  mint: string;
};

type Row = {
  wallet: string;
  lossLamports: string;
  rebateLamports: string;
  dueLamports: string;
  lossUsd: string;
  rebateUsd: string;
  holdSeconds: number;
  note: string;
  status: "eligible" | "claimed" | "sent";
  signature: string;
};

type Skipped = {
  wallet: string;
  reason: string;
  lossLamports: string;
  holdSeconds: number;
};

type Snapshot = {
  takenAt: string;
  mint: string;
  solPriceUsd: string;
  txCount: number;
  swapCount: number;
  truncated: boolean;
  poolLamports?: string;
  totalLossLamports?: string;
  rows: Row[];
  skipped: Skipped[];
  dueCount: number;
  dueLamports: string;
};

function solOf(lamports: string) {
  const value = BigInt(lamports || "0");
  const whole = value / 1_000_000_000n;
  const frac = (value % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

function holdOf(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m ${rest}s`;
}

function short(value: string) {
  if (value.length < 12) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export default function Dashboard({ initial }: { initial: { vault: Vault | null; error: string } }) {
  const [vault, setVault] = useState<Vault | null>(initial.vault);
  const [loadError, setLoadError] = useState(initial.error);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [notice, setNotice] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState("");

  const loadVault = useCallback(async () => {
    const response = await fetch("/api/rebate", { cache: "no-store" });
    const body = (await response.json()) as Vault & { error?: string };
    if (!response.ok) {
      setLoadError(body.error || "Could not read the vault balance.");
      return;
    }
    setVault(body);
    setLoadError("");
  }, []);

  const loadSnapshot = useCallback(async () => {
    const response = await fetch("/api/rebate/snapshot", { cache: "no-store" });
    const body = (await response.json()) as { snapshot?: Snapshot | null; error?: string };
    if (!response.ok) {
      setNotice(body.error || "Could not read the snapshot.");
      return;
    }
    setSnapshot(body.snapshot ?? null);
  }, []);

  useEffect(() => {
    void loadVault();
    void loadSnapshot();
  }, [loadVault, loadSnapshot]);

  async function takeSnapshot() {
    setBusy("snapshot");
    setNotice("");
    setOutput("");
    const response = await fetch("/api/rebate/snapshot", { method: "POST" });
    const body = (await response.json()) as { snapshot?: Snapshot; error?: string };
    setBusy("");
    if (!response.ok || !body.snapshot) {
      setNotice(body.error || "The snapshot failed.");
      return;
    }
    setSnapshot(body.snapshot);
    setNotice(
      body.snapshot.rows.length
        ? `${body.snapshot.rows.length} wallets. ${solOf(body.snapshot.poolLamports || "0")} SOL is split by loss, largest first.`
        : "No wallet fit the rules.",
    );
  }

  async function runPayouts() {
    setBusy("run");
    setNotice("");
    setOutput("");
    const response = await fetch("/api/rebate/run", { method: "POST" });
    const body = (await response.json()) as { error?: string; stdout?: string; stderr?: string; snapshot?: Snapshot | null };
    setBusy("");
    if (!response.ok) {
      setNotice(body.error || "Run failed. Nothing was sent.");
      return;
    }
    if (body.snapshot) setSnapshot(body.snapshot);
    setOutput([body.stdout, body.stderr].filter(Boolean).join("\n"));
    setNotice("The Python script finished.");
    await loadVault();
  }

  const balanceText = vault ? `${vault.balanceSol} SOL` : "Unavailable";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="mark">R</div>
          <div>
            <strong>Rebate</strong>
            <span>Loss snapshot</span>
          </div>
        </div>
        <div className="side-foot">
          <label>Vault balance</label>
          <strong className="balance-hero" style={{ fontSize: 18 }}>{balanceText}</strong>
          <label>Vault address</label>
          <input readOnly value={vault?.address ?? ""} />
        </div>
      </aside>
      <main className="main">
        <div className="top">
          <div>
            <p className="k">Vault balance</p>
            <h1 className="balance-hero">{balanceText}</h1>
            <p className="lede">
              {vault?.address || "The balance loads from the vault wallet on mainnet."}
              {vault?.mint ? ` Mint ${vault.mint}` : " Set TOKEN_MINT in the site .env."}
            </p>
          </div>
          <div className="pills">
            <button className="btn" type="button" disabled={busy !== ""} onClick={() => void takeSnapshot()}>
              {busy === "snapshot" ? "Reading sells…" : "Take snapshot"}
            </button>
            <button className="btn-ghost" type="button" disabled={busy !== "" || !snapshot?.dueCount} onClick={() => void runPayouts()}>
              {busy === "run" ? "Running…" : "Run"}
            </button>
          </div>
        </div>

        {loadError && <div className="banner bad">{loadError}</div>}
        {notice && <div className="banner">{notice}</div>}

        <section className="grid">
          <article className="card">
            <p className="k">Balance</p>
            <p className="v">{balanceText}</p>
            <p className="s">SOL in the vault right now</p>
          </article>
          <article className="card">
            <p className="k">Spendable</p>
            <p className="v">{vault ? `${vault.spendableSol} SOL` : "Unavailable"}</p>
            <p className="s">After the 0.0011 SOL reserve</p>
          </article>
          <article className="card">
            <p className="k">Ready to send</p>
            <p className="v">{snapshot ? `${solOf(snapshot.dueLamports)} SOL` : "0 SOL"}</p>
            <p className="s">{snapshot ? `${snapshot.dueCount} wallets in the file` : "Take a snapshot first"}</p>
          </article>
        </section>

        <section className="panel" style={{ marginTop: 12 }}>
          <h2>How a payout happens</h2>
          <ol className="steps">
            <li>Take snapshot. The site reads sells of the mint in TOKEN_MINT and saves data/snapshot.json.</li>
            <li>Commit that file and push it. The claim page reads it, so a wallet on the list is eligible and one that is missing is not.</li>
            <li>Run pays the eligible wallets in the file. It starts the Python script, which sends the SOL from the vault.</li>
          </ol>
          <p className="hint">
            Spendable SOL is divided by the total losses. The largest loss gets the largest share, and an equal loss gets an equal share. A share cannot pass the loss, $100, or half the SOL spent buying. Loss at least $5. A share under 0.005 SOL is not sent. A gain does not cancel a loss. There is no minimum hold.
            {snapshot?.poolLamports
              ? ` This snapshot splits ${solOf(snapshot.poolLamports)} SOL across ${solOf(snapshot.totalLossLamports || "0")} SOL of losses.`
              : ""}
            {snapshot ? ` SOL price $${snapshot.solPriceUsd}. ${snapshot.txCount} transactions, ${snapshot.swapCount} swaps.` : ""}
            {snapshot?.truncated ? " The history was cut off at the page limit." : ""}
          </p>
        </section>

        <section className="panel" style={{ marginTop: 12 }}>
          <h2>Eligible sellers</h2>
          <p className="hint">Highest loss first. The rebate is that wallet’s share of the vault, so it is smaller than the loss while the vault is smaller than the losses.</p>
          {!snapshot && <p className="empty">No snapshot yet.</p>}
          {snapshot && snapshot.rows.length === 0 && <p className="empty">No wallet fit the rules in this snapshot.</p>}
          {snapshot && snapshot.rows.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Held</th>
                  <th>Loss</th>
                  <th>Rebate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rows.map((row) => (
                  <tr key={row.wallet}>
                    <td className="mono addr" title={row.wallet}>{short(row.wallet)}</td>
                    <td>{holdOf(row.holdSeconds)}</td>
                    <td>
                      {solOf(row.lossLamports)} SOL
                      <span className="mono" style={{ display: "block", color: "var(--faint)" }}>${row.lossUsd}</span>
                    </td>
                    <td>
                      {solOf(row.rebateLamports)} SOL
                      <span className="mono" style={{ display: "block", color: "var(--faint)" }}>
                        ${row.rebateUsd}
                        {row.note ? ` · ${row.note}` : ""}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${row.status === "claimed" ? "warn" : "ok"}`}>
                        {row.status === "sent" ? "Sent" : row.status === "claimed" ? "Claimed" : "Eligible"}
                      </span>
                      {row.signature && (
                        <a className="mono" style={{ display: "block", marginTop: 4 }} href={`https://solscan.io/tx/${row.signature}`} target="_blank" rel="noreferrer">
                          {short(row.signature)}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {snapshot && snapshot.skipped.length > 0 && (
          <section className="panel" style={{ marginTop: 12 }}>
            <h2>Did not fit</h2>
            <p className="hint">These sellers are not on the list the claim page checks.</p>
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Held</th>
                  <th>Loss</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.skipped.map((row) => (
                  <tr key={`${row.wallet}-${row.reason}`}>
                    <td className="mono addr" title={row.wallet}>{short(row.wallet)}</td>
                    <td>{holdOf(row.holdSeconds)}</td>
                    <td>{row.lossLamports === "0" ? "—" : `${solOf(row.lossLamports)} SOL`}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {output && <pre className="response">{output}</pre>}
      </main>
    </div>
  );
}
