/**
 * AAMVA DL/ID barcode payload parser.
 *
 * Every US and Canadian driver's licence carries a PDF417 barcode on the BACK
 * holding the cardholder's details as machine-readable text, in the format set
 * by the AAMVA DL/ID Card Design Standard. Reading it is how this app learns a
 * REAL date of birth instead of asking someone to type one — a typed birthday
 * is a claim; the barcode is what the issuing DMV encoded.
 *
 * WHAT THIS DOES NOT DO: prove the card is genuine. A counterfeit can carry a
 * well-formed barcode, and nothing in the payload is signed. This yields
 * "the card says 21+, and the card is not expired" — which is a screen, not
 * proof. The legal control remains the driver checking the physical card at
 * the door (4 CCR § 15413), and a vendor adapter (see ./veriff.ts) is what
 * adds authenticity checks. Treat a pass here as "worth dispatching", never as
 * "identity established".
 *
 * Format, briefly: a header ("@", LF, RS, CR, "ANSI ", 6-digit issuer id,
 * 2-digit AAMVA version, …) followed by subfiles of LF-terminated elements,
 * each a 3-letter code then its value — DBB is date of birth, DBA expiry,
 * DCS family name, DAC first name.
 */

export interface AamvaId {
  firstName: string | null;
  lastName: string | null;
  /** ISO `YYYY-MM-DD`. */
  dateOfBirth: string | null;
  /** ISO `YYYY-MM-DD`. */
  expiryDate: string | null;
  licenseNumber: string | null;
  /** Issuing jurisdiction, e.g. "CA". */
  jurisdiction: string | null;
  country: "USA" | "CAN" | null;
}

/**
 * Elements are LF-terminated, so anchoring each code to a line start keeps a
 * three-letter sequence that happens to sit INSIDE another value (a street
 * called "DBB St") from being read as a field of its own.
 */
function element(raw: string, code: string): string | null {
  const m = new RegExp(`(?:^|[\\n\\r])${code}([^\\n\\r]*)`).exec(raw);
  const value = m?.[1]?.trim();
  return value ? value : null;
}

/**
 * AAMVA dates are eight digits in one of two orders, and the payload does not
 * always say which: US cards from version 2 on use MMDDCCYY, Canadian cards
 * and version 1 use CCYYMMDD. Rather than trust the header alone (issuers do
 * get this wrong), try both readings and keep the one that yields a real
 * calendar date — falling back to the version/country hint only when both do.
 */
function parseDate(value: string | null, preferCcyyFirst: boolean): string | null {
  if (!value || !/^\d{8}$/.test(value)) return null;

  const asMmDdCcYy = { y: +value.slice(4, 8), m: +value.slice(0, 2), d: +value.slice(2, 4) };
  const asCcYyMmDd = { y: +value.slice(0, 4), m: +value.slice(4, 6), d: +value.slice(6, 8) };

  const plausible = (p: { y: number; m: number; d: number }) =>
    p.y >= 1900 &&
    p.y <= 2100 &&
    p.m >= 1 &&
    p.m <= 12 &&
    p.d >= 1 &&
    p.d <= 31 &&
    // Rejects 31 February and friends: a Date built from an impossible day
    // rolls into the next month, so the round-trip stops matching.
    new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDate() === p.d;

  const mmddOk = plausible(asMmDdCcYy);
  const ccyyOk = plausible(asCcYyMmDd);
  if (!mmddOk && !ccyyOk) return null;

  const chosen =
    mmddOk && ccyyOk ? (preferCcyyFirst ? asCcYyMmDd : asMmDdCcYy) : mmddOk ? asMmDdCcYy : asCcYyMmDd;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${chosen.y}-${pad(chosen.m)}-${pad(chosen.d)}`;
}

/** Parses a decoded PDF417 payload. Returns null when it isn't an AAMVA card. */
export function parseAamva(raw: string): AamvaId | null {
  if (!raw) return null;
  // Real-world scans sometimes carry leading noise before the file header, so
  // anchor on the marker rather than on byte 0.
  const start = raw.indexOf("ANSI ");
  if (start < 0) return null;

  const version = Number(raw.slice(start + 11, start + 13));
  const country = raw.includes("DCGCAN") ? "CAN" : raw.includes("DCGUSA") ? "USA" : null;
  const preferCcyyFirst = country === "CAN" || (Number.isFinite(version) && version < 2);

  const dateOfBirth = parseDate(element(raw, "DBB"), preferCcyyFirst);
  const expiryDate = parseDate(element(raw, "DBA"), preferCcyyFirst);
  if (!dateOfBirth) return null;

  return {
    firstName: element(raw, "DAC") ?? element(raw, "DCT"),
    lastName: element(raw, "DCS"),
    dateOfBirth,
    expiryDate,
    licenseNumber: element(raw, "DAQ"),
    jurisdiction: element(raw, "DAJ"),
    country,
  };
}

/** Whole years elapsed, by calendar date — not by dividing milliseconds. */
export function ageOn(dateOfBirth: string, on: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = on.getUTCFullYear() - y;
  const hadBirthday =
    on.getUTCMonth() + 1 > mo || (on.getUTCMonth() + 1 === mo && on.getUTCDate() >= d);
  if (!hadBirthday) age -= 1;
  return age < 0 || age > 130 ? null : age;
}

export type AamvaCheck =
  | { ok: true; age: number; id: AamvaId }
  | { ok: false; reason: "underage" | "expired" | "unreadable"; age?: number };

/**
 * The whole verdict a barcode can support. `now` is injected so the caller
 * owns the clock (and tests own it too).
 */
export function checkAamva(raw: string, minAge: number, now: Date): AamvaCheck {
  const id = parseAamva(raw);
  if (!id?.dateOfBirth) return { ok: false, reason: "unreadable" };

  const age = ageOn(id.dateOfBirth, now);
  if (age === null) return { ok: false, reason: "unreadable" };
  if (age < minAge) return { ok: false, reason: "underage", age };

  // An expired licence is not acceptable identification at delivery, so it is
  // not acceptable here either. Absent expiry is not treated as expired —
  // some jurisdictions omit it — the door check remains the backstop.
  if (id.expiryDate) {
    const expiry = Date.parse(`${id.expiryDate}T23:59:59Z`);
    if (Number.isFinite(expiry) && expiry < now.getTime()) {
      return { ok: false, reason: "expired", age };
    }
  }

  return { ok: true, age, id };
}
