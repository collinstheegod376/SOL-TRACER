import { NextResponse } from "next/server";
import { assertWallet } from "@/lib/rebate";
import { markClaimed } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { wallet?: string } | null;
  if (!body?.wallet) return NextResponse.json({ error: "Wallet is required." }, { status: 400 });
  try {
    const address = assertWallet(body.wallet);
    return NextResponse.json(markClaimed(address));
  } catch {
    return NextResponse.json({ error: "That is not a Solana address." }, { status: 400 });
  }
}
