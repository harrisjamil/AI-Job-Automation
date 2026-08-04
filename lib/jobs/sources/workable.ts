import { WORKABLE_BOARDS } from "@/lib/jobs/companies/ats-boards"
import {
  filterEngineeringJobs,
  fetchJson,
  isRemoteLocation,
  mapPool,
} from "@/lib/jobs/sources/ats-shared"
import type { NormalizedJob } from "@/lib/jobs/types"

type WorkableJob = {
  id?: string
  shortcode?: string
  title?: string
  url?: string
  application_url?: string
  location?: { city?: string; country?: string; telecommuting?: boolean }
  department?: string
  created_at?: string
  description?: string
  employment_type?: string
}

type WorkableResponse = {
  jobs?: WorkableJob[]
}

export async function fetchWorkableJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const batches = await mapPool(WORKABLE_BOARDS, 3, async (board) => {
    try {
      const data = await fetchJson<WorkableResponse>(
        `https://apply.workable.com/api/v1/widget/accounts/${board.slug}`,
        signal
      )
      const list = Array.isArray(data.jobs) ? data.jobs : []
      return list
        .filter((item) => (item.id || item.shortcode) && item.title)
        .map((item) => {
          const id = item.shortcode || item.id!
          const locationParts = [item.location?.city, item.location?.country].filter(
            Boolean
          )
          const location = locationParts.join(", ") || null
          const remote =
            Boolean(item.location?.telecommuting) || isRemoteLocation(location)

          return {
            externalId: id,
            source: "workable",
            sourceCategory: (board.category === "ai_ml" ? "ai_ml" : "ats") as
              | "ai_ml"
              | "ats",
            title: item.title!,
            company: board.name,
            location,
            isRemote: remote,
            url:
              item.url ||
              item.application_url ||
              `https://apply.workable.com/${board.slug}/j/${id}/`,
            description: item.description ?? null,
            salary: null,
            tags: [item.department, item.employment_type].filter(Boolean) as string[],
            postedAt: item.created_at ? new Date(item.created_at) : null,
          } satisfies NormalizedJob
        })
    } catch {
      return [] as NormalizedJob[]
    }
  })

  return filterEngineeringJobs(batches.flat(), keywords)
}
