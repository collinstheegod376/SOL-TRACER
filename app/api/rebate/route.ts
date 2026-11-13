import { NextResponse } from "next/server";
import { lookupEligibility } from "@/lib/eligibility";
import { assertWallet, vaultView } from "@/lib/rebate";

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
      return NextResponse.json(lookupEligibility(address));
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
