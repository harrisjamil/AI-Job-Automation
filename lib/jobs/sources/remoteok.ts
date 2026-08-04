import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import type { NormalizedJob } from "@/lib/jobs/types"

type RemoteOkJob = {
  id?: string | number
  slug?: string
  position?: string
  company?: string
  location?: string
  description?: string
  url?: string
  apply_url?: string
  salary_min?: number
  salary_max?: number
  tags?: string[]
  date?: string
  epoch?: number
}

export async function fetchRemoteOkJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const response = await fetch("https://remoteok.com/api", {
    headers: {
      Accept: "application/json",
      "User-Agent": "AI-Job-Automation/1.0",
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`RemoteOK failed with status ${response.status}`)
  }

  const data = (await response.json()) as RemoteOkJob[]
  if (!Array.isArray(data)) return []

  const jobs: NormalizedJob[] = []

  for (const item of data) {
    if (!item || !item.id || !item.position) continue

    const haystack = [
      item.position,
      item.company,
      item.location,
      item.description,
      ...(item.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")

    if (!matchesKeywords(haystack, keywords)) {
      continue
    }

    const salary =
      item.salary_min || item.salary_max
        ? `$${item.salary_min ?? "?"}-$${item.salary_max ?? "?"}`
        : null

    jobs.push({
      externalId: String(item.id),
      source: "remoteok",
      title: item.position,
      company: item.company ?? null,
      location: item.location || "Worldwide Remote",
      isRemote: true,
      url:
        item.url ||
        item.apply_url ||
        `https://remoteok.com/remote-jobs/${item.slug ?? item.id}`,
      description: item.description ?? null,
      salary,
      tags: item.tags ?? [],
      postedAt: item.epoch
        ? new Date(item.epoch * 1000)
        : item.date
          ? new Date(item.date)
          : null,
    })
  }

  return jobs
}
