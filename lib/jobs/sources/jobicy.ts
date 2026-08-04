import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchJson, formatSalaryRange } from "@/lib/jobs/sources/http"
import type { NormalizedJob } from "@/lib/jobs/types"

type JobicyJob = {
  id?: number
  url?: string
  jobTitle?: string
  companyName?: string
  jobIndustry?: string[]
  jobType?: string[]
  jobGeo?: string
  jobLevel?: string
  jobDescription?: string
  jobExcerpt?: string
  pubDate?: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  salaryPeriod?: string
}

type JobicyResponse = {
  jobs?: JobicyJob[]
}

export async function fetchJobicyJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const tag = keywords.slice(0, 2).join(" ").trim()
  const url = tag
    ? `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`
    : "https://jobicy.com/api/v2/remote-jobs?count=50"

  let data = await fetchJson<JobicyResponse>(url, signal)
  let list = Array.isArray(data.jobs) ? data.jobs : []

  if (list.length < 5 && tag) {
    data = await fetchJson<JobicyResponse>(
      "https://jobicy.com/api/v2/remote-jobs?count=50",
      signal
    )
    list = Array.isArray(data.jobs) ? data.jobs : []
  }

  const jobs: NormalizedJob[] = []

  for (const item of list) {
    if (!item.id || !item.jobTitle || !item.url) continue

    const haystack = [
      item.jobTitle,
      item.companyName,
      item.jobGeo,
      item.jobLevel,
      item.jobExcerpt,
      item.jobDescription,
      ...(item.jobIndustry ?? []),
      ...(item.jobType ?? []),
    ]
      .filter(Boolean)
      .join(" ")

    if (!matchesKeywords(haystack, keywords)) continue

    jobs.push({
      externalId: String(item.id),
      source: "jobicy",
      title: item.jobTitle,
      company: item.companyName ?? null,
      location: item.jobGeo || "Worldwide Remote",
      isRemote: true,
      url: item.url,
      description: item.jobDescription || item.jobExcerpt || null,
      salary: formatSalaryRange(
        item.salaryMin,
        item.salaryMax,
        item.salaryCurrency,
        item.salaryPeriod
      ),
      tags: [
        ...(item.jobIndustry ?? []),
        ...(item.jobType ?? []),
        ...(item.jobLevel ? [item.jobLevel] : []),
      ],
      postedAt: item.pubDate ? new Date(item.pubDate) : null,
    })
  }

  return jobs
}
