import { forward } from "../../lib/site";

export const dynamic = "force-dynamic";

export function GET() {
  return forward("/api/rebate", "GET");
}
