import { GREENHOUSE_BOARDS } from "@/lib/jobs/companies/ats-boards"
import {
  filterEngineeringJobs,
  fetchJson,
  isRemoteLocation,
  mapPool,
} from "@/lib/jobs/sources/ats-shared"
import type { NormalizedJob } from "@/lib/jobs/types"

type GreenhouseJob = {
  id?: number
  title?: string
  absolute_url?: string
  updated_at?: string
  location?: { name?: string }
  metadata?: Array<{ name?: string; value?: string | null }>
  departments?: Array<{ name?: string }>
  offices?: Array<{ name?: string; location?: string }>
  content?: string
}

type GreenhouseResponse = {
  jobs?: GreenhouseJob[]
}

export async function fetchGreenhouseJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const boards = GREENHOUSE_BOARDS

  const batches = await mapPool(boards, 6, async (board) => {
    try {
      const data = await fetchJson<GreenhouseResponse>(
        `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`,
        signal
      )
      const list = Array.isArray(data.jobs) ? data.jobs : []
      return list
        .filter((item) => item.id && item.title && item.absolute_url)
        .map((item) => {
          const location =
            item.location?.name ||
            item.offices?.map((o) => o.name || o.location).filter(Boolean).join(", ") ||
            null
          const tags = [
            ...(item.departments?.map((d) => d.name).filter(Boolean) as string[]),
            board.category === "ai_ml" ? "ai" : "",
          ].filter(Boolean)

          return {
            externalId: String(item.id),
            source: "greenhouse",
            sourceCategory: "ats" as const,
            title: item.title!,
            company: board.name,
            location,
            isRemote: isRemoteLocation(location, item.title),
            url: item.absolute_url!,
            description: item.content ?? null,
            salary: null,
            tags,
            postedAt: item.updated_at ? new Date(item.updated_at) : null,
          } satisfies NormalizedJob
        })
    } catch {
      return [] as NormalizedJob[]
    }
  })

  return filterEngineeringJobs(batches.flat(), keywords)
}
