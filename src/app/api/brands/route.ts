import { json } from "@/lib/http";
import { getBrands } from "@/lib/store";

/** GET /api/brands — the brand rail's data for the native app (name, logo, count). */
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  return json({ brands: await getBrands() }, { headers: { "cache-control": "public, max-age=300" } });
}
