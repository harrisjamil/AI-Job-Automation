import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchJson, isRemoteLocation } from "@/lib/jobs/sources/http"
import type { NormalizedJob } from "@/lib/jobs/types"

type MuseJob = {
  id?: number
  name?: string
  contents?: string
  publication_date?: string
  type?: string
  locations?: Array<{ name?: string }>
  categories?: Array<{ name?: string }>
  levels?: Array<{ name?: string }>
  tags?: Array<{ name?: string }>
  refs?: { landing_page?: string }
  company?: { name?: string }
}

type MuseResponse = {
  results?: MuseJob[]
}

export async function fetchTheMuseJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const query = keywords.slice(0, 3).join(" ").trim()
  const pages = [0, 1]
  const jobs: NormalizedJob[] = []
  const seen = new Set<string>()

  await Promise.all(
    pages.map(async (page) => {
      const params = new URLSearchParams({
        page: String(page),
        descending: "true",
      })
      if (query) params.set("q", query)
      params.append("category", "Software Engineering")
      params.append("category", "Data Science")
      params.append("category", "UX")
      params.append("category", "Design and UX")

      const data = await fetchJson<MuseResponse>(
        `https://www.themuse.com/api/public/jobs?${params.toString()}`,
        signal
      )

      for (const item of data.results ?? []) {
        const url = item.refs?.landing_page
        if (!item.id || !item.name || !url) continue
        if (seen.has(String(item.id))) continue

        const locations = (item.locations ?? [])
          .map((loc) => loc.name)
          .filter(Boolean) as string[]
        const location = locations[0] ?? null
        const haystack = [
          item.name,
          item.company?.name,
          item.contents,
          ...locations,
          ...(item.categories ?? []).map((c) => c.name),
          ...(item.levels ?? []).map((l) => l.name),
          ...(item.tags ?? []).map((t) => t.name),
        ]
          .filter(Boolean)
          .join(" ")

        if (!matchesKeywords(haystack, keywords)) continue

        seen.add(String(item.id))
        jobs.push({
          externalId: String(item.id),
          source: "themuse",
          title: item.name,
          company: item.company?.name ?? null,
          location: locations.slice(0, 3).join("; ") || null,
          isRemote: isRemoteLocation(...locations, item.name, item.contents),
          url,
          description: item.contents ?? null,
          salary: null,
          tags: [
            ...(item.categories ?? []).map((c) => c.name).filter(Boolean) as string[],
            ...(item.levels ?? []).map((l) => l.name).filter(Boolean) as string[],
            ...(item.type ? [item.type] : []),
          ],
          postedAt: item.publication_date
            ? new Date(item.publication_date)
            : null,
        })
      }
    })
  )

  return jobs
}
