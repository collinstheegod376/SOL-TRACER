import { NextResponse } from "next/server";

const site = process.env.SITE_URL || "http://127.0.0.1:3000";

export async function forward(path: string, method: "GET" | "POST") {
  const token = process.env.ADMIN_JWT_SECRET || "";
  try {
    const response = await fetch(`${site}${path}`, {
      method,
      headers: { "x-admin-token": token },
      cache: "no-store",
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The site is not reachable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
