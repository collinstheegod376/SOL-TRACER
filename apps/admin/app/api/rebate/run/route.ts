import { forward } from "../../../lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function POST() {
  return forward("/api/rebate/run", "POST");
}
