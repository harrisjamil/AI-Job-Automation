import type { NormalizedJob } from "@/lib/jobs/types"

type AdzunaJob = {
  id?: string | number
  title?: string
  company?: { display_name?: string }
  location?: { display_name?: string }
  description?: string
  redirect_url?: string
  salary_min?: number
  salary_max?: number
  created?: string
  contract_time?: string
}

/**
 * Optional paid aggregator. Runs only when ADZUNA_APP_ID + ADZUNA_APP_KEY are set.
 * Searches multiple countries for worldwide coverage.
 */
export async function fetchAdzunaJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  const query = keywords.slice(0, 5).join(" ").trim() || "software developer"
  const countries = ["us", "gb", "ca", "au", "de", "nl", "in", "sg"]
  const jobs: NormalizedJob[] = []

  await Promise.all(
    countries.map(async (country) => {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&results_per_page=20&what=${encodeURIComponent(query)}&content-type=application/json`
        const response = await fetch(url, { signal })
        if (!response.ok) return

        const data = (await response.json()) as { results?: AdzunaJob[] }
        for (const item of data.results ?? []) {
          if (!item.id || !item.title || !item.redirect_url) continue
          const location = item.location?.display_name ?? null
          const isRemote = /remote|worldwide|anywhere/i.test(
            `${item.title} ${location ?? ""} ${item.description ?? ""}`
          )
          const salary =
            item.salary_min || item.salary_max
              ? `${item.salary_min ?? "?"}-${item.salary_max ?? "?"}`
              : null

          jobs.push({
            externalId: `${country}-${item.id}`,
            source: "adzuna",
            title: item.title,
            company: item.company?.display_name ?? null,
            location,
            isRemote,
            url: item.redirect_url,
            description: item.description ?? null,
            salary,
            tags: [],
            postedAt: item.created ? new Date(item.created) : null,
          })
        }
      } catch {
        // Skip failed country silently
      }
    })
  )

  return jobs
}
