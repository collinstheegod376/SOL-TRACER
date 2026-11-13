"""Send SOL from the operator vault. No program deploy.

Usage:
  python scripts/disburse.py scripts/payouts.csv
  python scripts/disburse.py scripts/payouts.csv --send

The CSV has a header and one recipient per line: wallet,sol
A run without --send only prints the plan. Nothing is signed or sent.
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import sys
import urllib.request
from pathlib import Path

from solders.hash import Hash
from solders.keypair import Keypair
from solders.message import Message
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import Transaction

ROOT = Path(__file__).resolve().parents[1]
KEY_PATH = ROOT / "keys" / "vault.json"
RENT_RESERVE = 1_100_000
FEE_LAMPORTS = 5_000
LAMPORTS_PER_SOL = 1_000_000_000


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def rpc_url() -> str:
    for path in (ROOT / ".env.local", ROOT / ".env", ROOT / "packages" / "indexer" / ".env"):
        url = load_env(path).get("HELIUS_RPC_URL") or load_env(path).get("SOLANA_RPC_URL")
        if url:
            return url
    sys.exit("No HELIUS_RPC_URL or SOLANA_RPC_URL in .env.local")


def rpc(url: str, method: str, params: list) -> dict:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    request = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode())
    if payload.get("error"):
        raise RuntimeError(payload["error"])
    return payload["result"]


def load_vault() -> Keypair:
    secret = json.loads(KEY_PATH.read_text(encoding="utf-8"))
    return Keypair.from_bytes(bytes(secret))


def read_payouts(path: Path) -> list[tuple[str, int]]:
    rows: list[tuple[str, int]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            wallet = (row.get("wallet") or "").strip()
            sol = (row.get("sol") or "").strip()
            if not wallet or not sol or wallet.startswith("#"):
                continue
            lamports_cell = (row.get("lamports") or "").strip()
            lamports = int(lamports_cell) if lamports_cell else int(round(float(sol) * LAMPORTS_PER_SOL))
            if lamports <= 0:
                sys.exit(f"{wallet} has a zero amount")
            Pubkey.from_string(wallet)
            rows.append((wallet, lamports))
    return rows


def sol(lamports: int) -> str:
    return f"{lamports / LAMPORTS_PER_SOL:.9f}".rstrip("0").rstrip(".")


def main() -> None:
    parser = argparse.ArgumentParser(description="Pay SOL from the vault wallet")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--send", action="store_true", help="Sign and send. Omit this to preview.")
    args = parser.parse_args()

    payouts = read_payouts(args.csv_path)
    if not payouts:
        sys.exit(f"No payout rows in {args.csv_path}")

    vault = load_vault()
    url = rpc_url()
    balance = int(rpc(url, "getBalance", [str(vault.pubkey())])["value"])
    fees = FEE_LAMPORTS * len(payouts)
    total = sum(amount for _, amount in payouts)
    remaining = balance - total - fees

    print(f"vault {vault.pubkey()}")
    print(f"balance {sol(balance)} SOL")
    print(f"payouts {sol(total)} SOL across {len(payouts)} transfers")
    print(f"network fees about {sol(fees)} SOL")
    print(f"left in the vault {sol(remaining)} SOL")
    for wallet, amount in payouts:
        print(f"  {wallet}  {sol(amount)} SOL")

    if remaining < RENT_RESERVE:
        sys.exit(
            f"Refusing. The vault would drop below {sol(RENT_RESERVE)} SOL, and the account would close."
        )
    if not args.send:
        print("Preview only. Run again with --send to pay.")
        return

    failed = 0
    for wallet, amount in payouts:
        try:
            blockhash = rpc(url, "getLatestBlockhash", [{"commitment": "confirmed"}])["value"]["blockhash"]
            instruction = transfer(
                TransferParams(
                    from_pubkey=vault.pubkey(),
                    to_pubkey=Pubkey.from_string(wallet),
                    lamports=amount,
                )
            )
            message = Message.new_with_blockhash([instruction], vault.pubkey(), Hash.from_string(blockhash))
            transaction = Transaction.new_unsigned(message)
            transaction.sign([vault], Hash.from_string(blockhash))
            signature = rpc(
                url,
                "sendTransaction",
                [
                    base64.b64encode(bytes(transaction)).decode(),
                    {"encoding": "base64", "preflightCommitment": "confirmed"},
                ],
            )
            print(f"sent {wallet} {sol(amount)} SOL  {signature}", flush=True)
            print(f"RESULT\tsent\t{wallet}\t{amount}\t{signature}", flush=True)
        except Exception as exc:
            failed += 1
            print(f"RESULT\tfailed\t{wallet}\t{amount}\t{exc}", flush=True)
            print(f"failed {wallet} {exc}", file=sys.stderr)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
