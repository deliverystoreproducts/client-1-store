import type { NextConfig } from "next";

/**
 * The storefront runs as a self-contained Node server (`output: "standalone"`),
 * so it can be dropped into any container host. Everything that talks to the
 * upstream commerce API happens inside that server process — see README.md.
 */
const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Do NOT ship the `x-powered-by` header — it says nothing useful and is one
  // more fingerprint on every response.
  poweredByHeader: false,

  // Client source maps are OFF on purpose. A production source map ships the
  // pre-bundling module graph to the browser: file paths, comments, dead
  // branches. This app's whole threat model is "the browser learns nothing
  // about the backend", and a source map is the cheapest way to break that.
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            // "The browser never talks to anyone but this origin" is the
            // site's core architectural invariant — this header makes the
            // BROWSER enforce it: no script, style, font, image, fetch,
            // worker or form target may leave 'self'. 'unsafe-inline' is the
            // one concession, for Next's own hydration scripts and the
            // pre-paint theme script; even with it, no REMOTE script can
            // load. (Nonce plumbing would close that too — tracked as future
            // hardening, it needs per-request header rewriting in proxy.ts.)
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "manifest-src 'self'",
              "worker-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default config;
