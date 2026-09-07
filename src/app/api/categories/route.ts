import { json } from "@/lib/http";
import { getCategories } from "@/lib/store";
import { categoryIconUrl } from "@/lib/category-art";

/**
 * GET /api/categories — the shop's categories for the native app (kamui-clip).
 *
 * The same list the home page's "Browse by category" row renders server-side,
 * with the icon resolved the same way: the operator's artwork wins, the bundled
 * icon fills the gap. Paths are same-origin, so the app prefixes the store
 * origin and nothing else.
 */
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  const categories = await getCategories();
  return json(
    {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        productCount: c.productCount,
        sortOrder: c.sortOrder,
        image: c.image,
        icon: c.image ?? categoryIconUrl(c.name),
      })),
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
