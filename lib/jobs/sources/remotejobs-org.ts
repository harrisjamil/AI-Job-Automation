import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchJson, formatSalaryRange } from "@/lib/jobs/sources/http"
import type { NormalizedJob } from "@/lib/jobs/types"

type RemoteJobsOrgJob = {
  id?: string
  title?: string
  url?: string
  apply_url?: string
  location?: string
  salary_min?: number | null
  salary_max?: number | null
  salary_text?: string | null
  type?: string
  description?: string
  published_at?: string
  company?: { name?: string }
  category?: { name?: string; slug?: string }
}

type RemoteJobsOrgResponse = {
  data?: RemoteJobsOrgJob[]
}

export async function fetchRemoteJobsOrgJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const query = keywords.slice(0, 3).join(" ").trim()
  const url = query
    ? `https://remotejobs.org/api/v1/jobs?limit=40&q=${encodeURIComponent(query)}`
    : "https://remotejobs.org/api/v1/jobs?limit=40&category=programming"

  const data = await fetchJson<RemoteJobsOrgResponse>(url, signal)
  const list = Array.isArray(data.data) ? data.data : []
  const jobs: NormalizedJob[] = []

  for (const item of list) {
    const link = item.apply_url || item.url
    if (!item.id || !item.title || !link) continue

    const haystack = [
      item.title,
      item.company?.name,
      item.location,
      item.description,
      item.type,
      item.category?.name,
    ]
      .filter(Boolean)
      .join(" ")

    if (!matchesKeywords(haystack, keywords)) continue

    jobs.push({
      externalId: item.id,
      source: "remotejobsorg",
      title: item.title,
      company: item.company?.name ?? null,
      location: item.location || "Worldwide Remote",
      isRemote: true,
      url: link,
      description: item.description ?? null,
      salary:
        item.salary_text ||
        formatSalaryRange(item.salary_min, item.salary_max),
      tags: [
        ...(item.category?.name ? [item.category.name] : []),
        ...(item.type ? [item.type] : []),
      ],
      postedAt: item.published_at ? new Date(item.published_at) : null,
    })
  }

  return jobs
}
