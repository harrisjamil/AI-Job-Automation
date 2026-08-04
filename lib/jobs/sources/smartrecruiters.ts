import { SMARTRECRUITERS_BOARDS } from "@/lib/jobs/companies/ats-boards"
import {
  filterEngineeringJobs,
  fetchJson,
  isRemoteLocation,
  mapPool,
} from "@/lib/jobs/sources/ats-shared"
import type { NormalizedJob } from "@/lib/jobs/types"

type SmartJob = {
  id?: string
  name?: string
  uuid?: string
  releasedDate?: string
  location?: { city?: string; region?: string; country?: string; remote?: boolean }
  department?: { label?: string }
  industry?: { label?: string }
  typeOfEmployment?: { label?: string }
  refNumber?: string
}

type SmartResponse = {
  content?: SmartJob[]
  totalFound?: number
}

export async function fetchSmartRecruitersJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const batches = await mapPool(SMARTRECRUITERS_BOARDS, 3, async (board) => {
    try {
      const data = await fetchJson<SmartResponse>(
        `https://api.smartrecruiters.com/v1/companies/${board.slug}/postings?limit=100`,
        signal
      )
      const list = Array.isArray(data.content) ? data.content : []
      return list
        .filter((item) => (item.id || item.uuid) && item.name)
        .map((item) => {
          const id = item.id || item.uuid!
          const locationParts = [
            item.location?.city,
            item.location?.region,
            item.location?.country,
          ].filter(Boolean)
          const location = locationParts.join(", ") || null
          const remote = Boolean(item.location?.remote) || isRemoteLocation(location)

          return {
            externalId: id,
            source: "smartrecruiters",
            sourceCategory: "ats" as const,
            title: item.name!,
            company: board.name,
            location,
            isRemote: remote,
            url: `https://jobs.smartrecruiters.com/${board.slug}/${id}`,
            description: null,
            salary: null,
            tags: [
              item.department?.label,
              item.industry?.label,
              item.typeOfEmployment?.label,
            ].filter(Boolean) as string[],
            postedAt: item.releasedDate ? new Date(item.releasedDate) : null,
          } satisfies NormalizedJob
        })
    } catch {
      return [] as NormalizedJob[]
    }
  })

  return filterEngineeringJobs(batches.flat(), keywords)
}
