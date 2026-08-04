export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json, application/xml, text/xml, */*",
      "User-Agent":
        "Mozilla/5.0 (compatible; AIJobAutomation/1.0; +https://localhost)",
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export async function fetchText(
  url: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent":
        "Mozilla/5.0 (compatible; AIJobAutomation/1.0; +https://localhost)",
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.text()
}

export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currency?: string | null,
  period?: string | null
): string | null {
  if (min == null && max == null) return null
  const cur = currency ? `${currency} ` : ""
  const range =
    min != null && max != null
      ? `${cur}${min}-${max}`
      : `${cur}${min ?? max}`
  return period ? `${range} / ${period}` : range
}

export function isRemoteLocation(...parts: Array<string | null | undefined>) {
  return /remote|worldwide|anywhere|global|distributed|work from home|wfh/i.test(
    parts.filter(Boolean).join(" ")
  )
}
