/**
 * GET /.well-known/apple-app-site-association — the iOS App Clip + Universal
 * Links association (kamui-clip). Served only when the two env vars exist:
 *   APPLE_TEAM_ID        the store's Apple Developer team (10 characters)
 *   APPLE_APP_BUNDLE_ID  the parent app's bundle id, e.g. digital.kamui.store.yb
 * Apple fetches this over HTTPS with no redirects; it must be JSON with no
 * extension and Content-Type application/json.
 */
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  const team = (process.env.APPLE_TEAM_ID || "").trim();
  const bundle = (process.env.APPLE_APP_BUNDLE_ID || "").trim();
  if (!team || !bundle) return new Response("Not found", { status: 404 });
  const app = `${team}.${bundle}`;
  const body = {
    applinks: { apps: [], details: [{ appIDs: [app], components: [{ "/": "/product/*" }, { "/": "/track/*" }, { "/": "/deal/*" }, { "/": "/app" }, { "/": "/products" }] }] },
    appclips: { apps: [`${app}.Clip`] },
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
  });
}
