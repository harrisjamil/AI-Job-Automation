import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchJson, formatSalaryRange } from "@/lib/jobs/sources/http"
import type { NormalizedJob } from "@/lib/jobs/types"

type HimalayasJob = {
  title?: string
  excerpt?: string
  companyName?: string
  companySlug?: string
  employmentType?: string
  minSalary?: number
  maxSalary?: number
  salaryPeriod?: string
  seniority?: string[]
  currency?: string
  locationRestrictions?: string[]
  categories?: string[]
  parentCategories?: string[]
  description?: string
  pubDate?: number
  applicationLink?: string
  guid?: string
}

type HimalayasResponse = {
  jobs?: HimalayasJob[]
}

export async function fetchHimalayasJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const query = keywords.slice(0, 4).join(" ").trim() || "software"
  const url = `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(query)}&limit=40&worldwide=true`

  const data = await fetchJson<HimalayasResponse>(url, signal)
  const list = Array.isArray(data.jobs) ? data.jobs : []
  const jobs: NormalizedJob[] = []

  for (const item of list) {
    const link = item.applicationLink || item.guid
    if (!item.title || !link) continue

    const haystack = [
      item.title,
      item.companyName,
      item.excerpt,
      item.description,
      item.employmentType,
      ...(item.locationRestrictions ?? []),
      ...(item.categories ?? []),
      ...(item.parentCategories ?? []),
      ...(item.seniority ?? []),
    ]
      .filter(Boolean)
      .join(" ")

    if (!matchesKeywords(haystack, keywords)) continue

    const externalId =
      link.replace(/^https?:\/\/himalayas\.app\//i, "").replace(/\W+/g, "-") ||
      `${item.companySlug ?? "co"}-${item.title}`

    jobs.push({
      externalId,
      source: "himalayas",
      title: item.title,
      company: item.companyName ?? null,
      location:
        item.locationRestrictions?.join(", ") || "Worldwide Remote",
      isRemote: true,
      url: link,
      description: item.description || item.excerpt || null,
      salary: formatSalaryRange(
        item.minSalary,
        item.maxSalary,
        item.currency,
        item.salaryPeriod
      ),
      tags: [
        ...(item.categories ?? []).slice(0, 8),
        ...(item.seniority ?? []),
        ...(item.employmentType ? [item.employmentType] : []),
      ],
      postedAt: item.pubDate ? new Date(item.pubDate * 1000) : null,
    })
  }

  return jobs
}
