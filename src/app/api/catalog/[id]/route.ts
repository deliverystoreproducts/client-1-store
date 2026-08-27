import { fail, json } from "@/lib/http";
import { getProductDetail } from "@/lib/store";

/** GET /api/catalog/:id — one product plus its related items. */

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return fail(404, "not_found", { message: "Not found." });
  }

  const detail = await getProductDetail(numeric);
  if (!detail) return fail(404, "not_found", { message: "Not found." });
  return json(detail);
}
