/**
 * One JSON-LD block. Server component; the object is serialised as-is.
 *
 * `<` is escaped so a value containing "</script>" can never close the tag —
 * product descriptions come from the operator's dashboard, not from us.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
