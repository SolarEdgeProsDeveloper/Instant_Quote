/**
 * Human-readable formatting + fuzzy search for the `quote_number`
 * sequence in the quotes table.
 *
 *   formatQuoteNumber(42)  → "Q00042"
 *   matchesQuoteNumber(42, "q42")   → true
 *   matchesQuoteNumber(42, "#00042") → true
 *   matchesQuoteNumber(420, "42")    → true (substring match)
 */

const PAD = 5;

export function formatQuoteNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `Q${String(n).padStart(PAD, "0")}`;
}

/**
 * Strip everything the user might type around a number (Q prefix, #,
 * whitespace, leading zeros) so we can compare cleanly to the raw
 * integer's string representation.
 */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[q#\s]/g, "")
    .replace(/^0+/, "");
}

export function matchesQuoteNumber(
  quoteNumber: number | null | undefined,
  search: string,
): boolean {
  if (quoteNumber == null) return false;
  const needle = normalize(search);
  // Empty needle = show everything (user cleared the search box).
  if (!needle) return true;
  return String(quoteNumber).includes(needle);
}
