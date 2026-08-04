import { ASHBY_BOARDS } from "@/lib/jobs/companies/ats-boards"
import {
  filterEngineeringJobs,
  fetchJson,
  isRemoteLocation,
  mapPool,
} from "@/lib/jobs/sources/ats-shared"
import type { NormalizedJob } from "@/lib/jobs/types"

type AshbyJob = {
  id?: string
  title?: string
  jobUrl?: string
  applyUrl?: string
  publishedAt?: string
  location?: string
  department?: string
  team?: string
  isRemote?: boolean
  descriptionHtml?: string
  descriptionPlain?: string
  employmentType?: string
}

type AshbyResponse = {
  jobs?: AshbyJob[]
}

export async function fetchAshbyJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const batches = await mapPool(ASHBY_BOARDS, 5, async (board) => {
    try {
      const data = await fetchJson<AshbyResponse>(
        `https://api.ashbyhq.com/posting-api/job-board/${board.slug}?includeCompensation=true`,
        signal
      )
      const list = Array.isArray(data.jobs) ? data.jobs : []
      return list
        .filter((item) => item.id && item.title && (item.jobUrl || item.applyUrl))
        .map((item) => {
          const location = item.location ?? null
          return {
            externalId: item.id!,
            source: "ashby",
            sourceCategory: (board.category === "ai_ml" ? "ai_ml" : "ats") as
              | "ai_ml"
              | "ats",
            title: item.title!,
            company: board.name,
            location,
            isRemote: Boolean(item.isRemote) || isRemoteLocation(location, item.title),
            url: item.jobUrl || item.applyUrl!,
            description: item.descriptionPlain ?? item.descriptionHtml ?? null,
            salary: null,
            tags: [item.department, item.team, item.employmentType].filter(
              Boolean
            ) as string[],
            postedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          } satisfies NormalizedJob
        })
    } catch {
      return [] as NormalizedJob[]
    }
  })

  return filterEngineeringJobs(batches.flat(), keywords)
}
