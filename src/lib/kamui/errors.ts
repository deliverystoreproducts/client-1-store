import "server-only";

/**
 * Every failure of an upstream call becomes one of these codes. The code is the
 * ONLY thing that may cross to the browser — never the upstream status text,
 * never the URL, never the response body.
 */
export type UpstreamErrorCode =
  | "not_configured" // we have no base URL / key
  | "unauthorized" // upstream rejected our API key
  | "forbidden" // key lacks the "store" scope
  | "customer_unauthorized" // customer token missing/expired/wrong tenant
  | "not_found"
  | "conflict" // stock / brand / sync refusal
  | "rejected" // upstream 400 — our request was invalid or business-rejected
  | "rate_limited"
  | "timeout"
  | "network"
  | "upstream_error"; // 5xx or an unparseable answer

export class UpstreamError extends Error {
  readonly name = "UpstreamError";
  readonly code: UpstreamErrorCode;
  readonly status: number;
  /**
   * The upstream's own message. SERVER-SIDE DIAGNOSTICS ONLY. Route handlers may
   * read specific *structured* fields off `body`, but must never forward this
   * string verbatim — it can name upstream hosts, tables and internals.
   */
  readonly upstreamMessage: string | undefined;
  readonly body: unknown;

  constructor(
    code: UpstreamErrorCode,
    status: number,
    opts: { upstreamMessage?: string; body?: unknown } = {},
  ) {
    super(`upstream ${code} (${status})`);
    this.code = code;
    this.status = status;
    this.upstreamMessage = opts.upstreamMessage;
    this.body = opts.body;
  }
}

/** Maps an upstream error onto the HTTP status our own BFF should return. */
export function publicStatusFor(code: UpstreamErrorCode): number {
  switch (code) {
    case "customer_unauthorized":
      return 401;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "rejected":
      return 400;
    case "rate_limited":
      return 429;
    case "timeout":
      return 504;
    // A bad/missing/unscoped key is OUR misconfiguration, not the visitor's
    // fault, and saying "401" would invite a guess about what we authenticate
    // against. It is a 503: the store cannot serve right now.
    case "not_configured":
    case "unauthorized":
    case "forbidden":
    case "network":
    case "upstream_error":
      return 503;
  }
}
