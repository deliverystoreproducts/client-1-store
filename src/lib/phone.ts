/**
 * Phone input handling. The backend normalises properly on its side; this is
 * only enough validation to avoid spending an SMS on an obvious typo.
 */

/** Digits only, or null when it cannot plausibly be a mobile number. */
export function normalizePhoneInput(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** (555) 123-4567 for 10-digit US numbers; unchanged otherwise. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/\D+/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return raw;
}
