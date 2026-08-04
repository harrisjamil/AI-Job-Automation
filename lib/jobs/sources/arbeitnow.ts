import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import type { NormalizedJob } from "@/lib/jobs/types"

type ArbeitnowJob = {
  slug?: string
  company_name?: string
  title?: string
  description?: string
  remote?: boolean
  url?: string
  location?: string
  created_at?: number
  tags?: string[]
  job_types?: string[]
}

export async function fetchArbeitnowJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const pages = [1, 2]
  const jobs: NormalizedJob[] = []
  const seen = new Set<string>()

  for (const page of pages) {
    const response = await fetch(
      `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "AI-Job-Automation/1.0",
        },
        signal,
      }
    )

    if (!response.ok) {
      throw new Error(`Arbeitnow failed with status ${response.status}`)
    }

    const data = (await response.json()) as { data?: ArbeitnowJob[] }
    const list = Array.isArray(data.data) ? data.data : []

    for (const item of list) {
      if (!item.slug || !item.title || !item.url) continue
      if (seen.has(item.slug)) continue

      const haystack = [
        item.title,
        item.company_name,
        item.location,
        item.description,
        ...(item.tags ?? []),
        ...(item.job_types ?? []),
      ]
        .filter(Boolean)
        .join(" ")

      if (!matchesKeywords(haystack, keywords)) {
        continue
      }

      seen.add(item.slug)
      jobs.push({
        externalId: item.slug,
        source: "arbeitnow",
        title: item.title,
        company: item.company_name ?? null,
        location: item.location || (item.remote ? "Remote" : null),
        isRemote: Boolean(item.remote),
        url: item.url,
        description: item.description ?? null,
        salary: null,
        tags: [...(item.tags ?? []), ...(item.job_types ?? [])],
        postedAt: item.created_at ? new Date(item.created_at * 1000) : null,
      })
    }
  }

  return jobs
}
