import { NextResponse } from "next/server";
import { runClaimedPayouts } from "@/lib/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const expected = process.env.REBATE_ADMIN_TOKEN || "";
  return expected.length > 0 && request.headers.get("x-admin-token") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json(await runClaimedPayouts());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
