import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchJson, isRemoteLocation } from "@/lib/jobs/sources/http"
import type { NormalizedJob } from "@/lib/jobs/types"

type NomadoJob = {
  id?: string
  slug?: string
  title?: string
  company?: string | null
  url?: string
  description?: string
  locationHint?: string
  locationLabel?: string
  remote?: boolean
  workLocation?: string
  tags?: string[]
  publishedAt?: string
  employmentTypes?: string[]
  industry?: string
}

type NomadoResponse = {
  jobs?: NomadoJob[]
}

export async function fetchNomado24Jobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const query = keywords.slice(0, 4).join(" ").trim() || "software"
  const url = `https://www.nomado24.de/api/jobs?q=${encodeURIComponent(query)}&per_page=50`

  const data = await fetchJson<NomadoResponse>(url, signal)
  const list = Array.isArray(data.jobs) ? data.jobs : []
  const jobs: NormalizedJob[] = []

  for (const item of list) {
    const externalId = item.slug || item.id
    if (!externalId || !item.title || !item.url) continue

    const location = item.locationHint || item.locationLabel || null
    const haystack = [
      item.title,
      item.company,
      location,
      item.description,
      item.industry,
      ...(item.tags ?? []),
      ...(item.employmentTypes ?? []),
    ]
      .filter(Boolean)
      .join(" ")

    if (!matchesKeywords(haystack, keywords)) continue

    jobs.push({
      externalId,
      source: "nomado24",
      title: item.title,
      company: item.company ?? null,
      location: location || (item.remote ? "Remote EU/EMEA" : null),
      isRemote:
        Boolean(item.remote) ||
        item.workLocation === "remote" ||
        isRemoteLocation(location, item.title),
      url: item.url,
      description: item.description ?? null,
      salary: null,
      tags: [
        ...(item.tags ?? []),
        ...(item.employmentTypes ?? []),
        ...(item.industry ? [item.industry] : []),
      ],
      postedAt: item.publishedAt ? new Date(item.publishedAt) : null,
    })
  }

  return jobs
}
