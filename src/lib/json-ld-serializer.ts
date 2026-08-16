/**
 * Serialize JSON-LD safely for use in `<script type="application/ld+json">`.
 * Escapes `<` as `\u003c` to prevent XSS via payload breaking out of the script element.
 *
 * Example attack vector prevented:
 * - Payload: {"title": "</script><script>alert(1)</script>"}
 * - Without escaping: script tag closes, malicious script executes
 * - With escaping: `\u003c/script>` prevents premature script tag closure
 */
export function serializeJsonLd(data: Record<string, unknown> | Record<string, unknown>[]): string {
  const json = JSON.stringify(data);
  // Escape `<` as `\u003c` to prevent breaking out of <script type="application/ld+json">
  return json.replace(/</g, '\\u003c');
}
