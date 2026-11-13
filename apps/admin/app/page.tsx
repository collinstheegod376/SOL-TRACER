import Dashboard, { type Vault } from "./dashboard";

export const dynamic = "force-dynamic";

async function loadVault(): Promise<{ vault: Vault | null; error: string }> {
  const site = process.env.SITE_URL || "http://127.0.0.1:3000";
  const token = process.env.ADMIN_JWT_SECRET || "";
  try {
    const response = await fetch(`${site}/api/rebate`, {
      headers: { "x-admin-token": token },
      cache: "no-store",
    });
    const body = (await response.json()) as Vault & { error?: string };
    if (!response.ok) return { vault: null, error: body.error || "Could not read the vault balance." };
    return { vault: body, error: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the vault balance.";
    return { vault: null, error: message };
  }
}

export default async function Page() {
  const initial = await loadVault();
  return <Dashboard initial={initial} />;
}
