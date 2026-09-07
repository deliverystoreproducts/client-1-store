import { fail, json } from "@/lib/http";
import { getDealDetail } from "@/lib/store";

/** GET /api/deals/:id — one deal and the products it covers (native app; same data as /deal/:id). */
export const dynamic = "force-dynamic";
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail(404, "not_found", { message: "Deal not found." });
  const found = await getDealDetail(id);
  if (!found) return fail(404, "not_found", { message: "Deal not found." });
  return json({ deal: found.deal, products: found.products }, { headers: { "cache-control": "public, max-age=120" } });
}
