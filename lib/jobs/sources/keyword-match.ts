/** Soft keyword match so aggregator feeds aren't wiped by over-specific profile terms. */
export function matchesKeywords(haystack: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true

  const text = haystack.toLowerCase()
  const normalized = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean)

  if (normalized.some((keyword) => text.includes(keyword))) return true

  const tokens = normalized
    .flatMap((keyword) => keyword.split(/[^a-z0-9+#.]/i))
    .filter((token) => token.length >= 4)

  if (tokens.length === 0) return true
  return tokens.some((token) => text.includes(token))
}
