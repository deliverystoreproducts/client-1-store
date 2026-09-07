import { json } from "@/lib/http";
import { getStoreProfile } from "@/lib/store";

/**
 * GET /api/store — the storefront's public profile for the native app
 * (kamui-clip): name, hero copy and media, minimum age. Same fields the
 * home page renders; nothing private lives on the profile.
 */
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  const p = await getStoreProfile();
  return json(
    {
      storeName: p.storeName,
      heroTitle: p.heroTitle,
      heroSubtitle: p.heroSubtitle,
      heroImage: p.heroImage,
      heroVideo: p.heroVideo,
      minAge: p.minAge,
      requireIdVerification: p.requireIdVerification,
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
