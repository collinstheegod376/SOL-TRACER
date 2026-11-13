import { NextResponse } from "next/server";
import { assertWallet, payoutsFor, vaultView } from "@/lib/rebate";
import { lookupWallet } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.REBATE_ADMIN_TOKEN || "";
  return expected.length > 0 && request.headers.get("x-admin-token") === expected;
}

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet");
  if (wallet) {
    try {
      const address = assertWallet(wallet);
      const found = lookupWallet(address);
      const history = payoutsFor(address).map((row) => ({
        sol: Number(row.lamports) / 1_000_000_000,
        status: row.status,
        signature: row.signature,
      }));
      return NextResponse.json({ ...found, history });
    } catch {
      return NextResponse.json({ error: "That is not a Solana address." }, { status: 400 });
    }
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json(await vaultView());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vault lookup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
