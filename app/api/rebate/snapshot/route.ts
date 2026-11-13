import { NextResponse } from "next/server";
import { snapshotView, takeSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const expected = process.env.REBATE_ADMIN_TOKEN || "";
  return expected.length > 0 && request.headers.get("x-admin-token") === expected;
}

export function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ snapshot: snapshotView() });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const snapshot = await takeSnapshot();
    return NextResponse.json({ snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The snapshot failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
