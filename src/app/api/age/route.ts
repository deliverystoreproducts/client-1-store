import { isSameOriginRequest } from "@/lib/csrf";
import { fail, json } from "@/lib/http";
import { setAgeGatePassed } from "@/lib/session";

/**
 * POST /api/age — record that the visitor confirmed they are of legal age.
 *
 * Server-set cookie rather than localStorage so the gate is decided while the
 * page is being rendered. A client-side gate flashes the storefront for a frame
 * before it covers it, which defeats the purpose.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");
  await setAgeGatePassed();
  return json({ status: "ok" });
}
