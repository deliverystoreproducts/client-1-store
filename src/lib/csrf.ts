/**
 * Same-origin enforcement for mutating requests.
 *
 * The session cookie is SameSite=Lax, which already blocks it from riding on a
 * cross-site form POST. This is the second line: a request that mutates state
 * must present an `Origin` whose host we recognise. No Origin, no match, no
 * service — fail closed, including when the header is absent, because "absent"
 * is exactly what a hand-rolled attacker request looks like.
 */

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedHosts(req: Request): string[] {
  const hosts: string[] = [];
  const host = req.headers.get("host");
  if (host) hosts.push(host);
  // Behind a reverse proxy the Host header can be the internal one while the
  // browser's Origin is the public name.
  const forwarded = req.headers.get("x-forwarded-host");
  if (forwarded) hosts.push(...forwarded.split(",").map((h) => h.trim()));
  const configured = process.env.SITE_ORIGIN;
  if (configured) {
    try {
      hosts.push(new URL(configured).host);
    } catch {
      /* a malformed SITE_ORIGIN simply contributes nothing */
    }
  }
  return hosts.filter(Boolean);
}

export function isSameOriginRequest(req: Request): boolean {
  if (!MUTATING.has(req.method.toUpperCase())) return true;

  const origin = req.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  return allowedHosts(req).includes(originHost);
}
