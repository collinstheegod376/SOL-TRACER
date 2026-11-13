import { NextResponse } from "next/server";
import { addPayout, sendPayout } from "@/lib/rebate";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.REBATE_ADMIN_TOKEN || "";
  return expected.length > 0 && request.headers.get("x-admin-token") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { wallet?: string; sol?: string; id?: string } | null;
  try {
    if (body?.id) return NextResponse.json(await sendPayout(body.id));
    if (!body?.wallet || !body.sol) {
      return NextResponse.json({ error: "Wallet and SOL amount are required." }, { status: 400 });
    }
    return NextResponse.json(addPayout(body.wallet, body.sol));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the payout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
