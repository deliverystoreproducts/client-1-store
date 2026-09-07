import { json } from "@/lib/http";
import { getDeals } from "@/lib/store";

/** GET /api/deals — the shop's active deals, as the /deals page shows them (native app). */
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  return json({ deals: await getDeals() }, { headers: { "cache-control": "public, max-age=120" } });
}
