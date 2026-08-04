import type { NormalizedJob } from "@/lib/jobs/types"

const COMPANY_SUFFIXES =
  /\b(inc|inc\.|llc|ltd|ltd\.|gmbh|ag|sa|plc|corp|corporation|co|company|technologies|technology|labs|lab|software|systems)\b\.?/gi

export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50000) || null
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

export function normalizeCompanyName(name: string | null | undefined): string | null {
  if (!name) return null
  const cleaned = normalizeWhitespace(name)
    .replace(COMPANY_SUFFIXES, "")
    .replace(/[|,].*$/, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned || null
}

export function normalizeTitle(title: string): string {
  return normalizeWhitespace(title)
    .toLowerCase()
    .replace(/\b(sr\.?|senior|jr\.?|junior|staff|principal|lead|ii|iii|iv)\b/g, " ")
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    ;["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"].forEach(
      (key) => parsed.searchParams.delete(key)
    )
    const path = parsed.pathname.replace(/\/+$/, "")
    return `${parsed.hostname.toLowerCase()}${path}`.toLowerCase()
  } catch {
    return url.toLowerCase().split("?")[0]
  }
}

export function jobFingerprint(job: Pick<NormalizedJob, "title" | "company" | "url">): string {
  const title = normalizeTitle(job.title)
  const company = (normalizeCompanyName(job.company) ?? "").toLowerCase()
  const urlKey = canonicalizeUrl(job.url)
  return `${company}::${title}::${urlKey}`
}

export function softFingerprint(job: Pick<NormalizedJob, "title" | "company">): string {
  const title = normalizeTitle(job.title)
  const company = (normalizeCompanyName(job.company) ?? "").toLowerCase()
  return `${company}::${title}`
}

export function normalizeJob(job: NormalizedJob): NormalizedJob {
  const description = stripHtml(job.description)
  const company = normalizeCompanyName(job.company) ?? job.company
  const title = normalizeWhitespace(job.title)
  const location = job.location ? normalizeWhitespace(job.location) : null
  const tags = [...new Set(job.tags.map((tag) => tag.trim()).filter(Boolean))]

  return {
    ...job,
    title,
    company,
    location,
    description,
    tags,
    fingerprint: job.fingerprint ?? jobFingerprint({ title, company, url: job.url }),
    sourceCategory: job.sourceCategory ?? "remote_board",
  }
}
