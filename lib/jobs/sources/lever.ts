import { LEVER_BOARDS } from "@/lib/jobs/companies/ats-boards"
import {
  filterEngineeringJobs,
  fetchJson,
  isRemoteLocation,
  mapPool,
} from "@/lib/jobs/sources/ats-shared"
import type { NormalizedJob } from "@/lib/jobs/types"

type LeverJob = {
  id?: string
  text?: string
  hostedUrl?: string
  createdAt?: number
  categories?: {
    location?: string
    team?: string
    department?: string
    commitment?: string
  }
  descriptionPlain?: string
  description?: string
  workplaceType?: string
}

export async function fetchLeverJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const batches = await mapPool(LEVER_BOARDS, 6, async (board) => {
    try {
      const list = await fetchJson<LeverJob[]>(
        `https://api.lever.co/v0/postings/${board.slug}?mode=json`,
        signal
      )
      if (!Array.isArray(list)) return [] as NormalizedJob[]

      return list
        .filter((item) => item.id && item.text && item.hostedUrl)
        .map((item) => {
          const location = item.categories?.location ?? null
          const remote =
            isRemoteLocation(location, item.workplaceType, item.text) ||
            /remote/i.test(item.workplaceType ?? "")

          return {
            externalId: item.id!,
            source: "lever",
            sourceCategory: "ats" as const,
            title: item.text!,
            company: board.name,
            location,
            isRemote: remote,
            url: item.hostedUrl!,
            description: item.descriptionPlain ?? item.description ?? null,
            salary: null,
            tags: [
              item.categories?.team,
              item.categories?.department,
              item.categories?.commitment,
            ].filter(Boolean) as string[],
            postedAt: item.createdAt ? new Date(item.createdAt) : null,
          } satisfies NormalizedJob
        })
    } catch {
      return [] as NormalizedJob[]
    }
  })

  return filterEngineeringJobs(batches.flat(), keywords)
}
