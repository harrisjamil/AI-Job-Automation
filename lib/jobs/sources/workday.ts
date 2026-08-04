import {
  filterEngineeringJobs,
  isRemoteLocation,
  mapPool,
} from "@/lib/jobs/sources/ats-shared"
import type { NormalizedJob } from "@/lib/jobs/types"

type WorkdayBoard = {
  name: string
  /** e.g. nvidia */
  tenant: string
  /** e.g. wd5 */
  host: string
  /** site path segment, e.g. NVIDIAExternalCareerSite */
  site: string
}

/**
 * Public Workday CXS search endpoints for large tech employers.
 * Shape: https://{tenant}.{host}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 */
const WORKDAY_BOARDS: WorkdayBoard[] = [
  {
    name: "NVIDIA",
    tenant: "nvidia",
    host: "wd5",
    site: "NVIDIAExternalCareerSite",
  },
  {
    name: "Salesforce",
    tenant: "salesforce",
    host: "wd12",
    site: "External_Career_Site",
  },
  {
    name: "Adobe",
    tenant: "adobe",
    host: "wd1",
    site: "external_experienced",
  },
]

type WorkdayHit = {
  title?: string
  externalPath?: string
  locationsText?: string
  postedOn?: string
  bulletFields?: Array<{ label?: string; text?: string }>
}

type WorkdayResponse = {
  jobPostings?: WorkdayHit[]
  total?: number
}

export async function fetchWorkdayJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const batches = await mapPool(WORKDAY_BOARDS, 2, async (board) => {
    try {
      const url = `https://${board.tenant}.${board.host}.myworkdayjobs.com/wday/cxs/${board.tenant}/${board.site}/jobs`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; AIJobAutomation/1.0; +https://localhost)",
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit: 50,
          offset: 0,
          searchText: keywords.slice(0, 3).join(" ") || "software engineer",
        }),
        signal,
      })

      if (!response.ok) return [] as NormalizedJob[]
      const data = (await response.json()) as WorkdayResponse
      const list = Array.isArray(data.jobPostings) ? data.jobPostings : []

      return list
        .filter((item) => item.title && item.externalPath)
        .map((item) => {
          const path = item.externalPath!.startsWith("/")
            ? item.externalPath!
            : `/${item.externalPath}`
          const jobUrl = `https://${board.tenant}.${board.host}.myworkdayjobs.com/en-US/${board.site}${path}`
          const location = item.locationsText ?? null

          return {
            externalId: path.replace(/\W+/g, "_").slice(0, 120),
            source: "workday",
            sourceCategory: "ats" as const,
            title: item.title!,
            company: board.name,
            location,
            isRemote: isRemoteLocation(location, item.title),
            url: jobUrl,
            description: null,
            salary: null,
            tags: ["workday"],
            postedAt: item.postedOn ? new Date(item.postedOn) : null,
          } satisfies NormalizedJob
        })
    } catch {
      return [] as NormalizedJob[]
    }
  })

  return filterEngineeringJobs(batches.flat(), keywords)
}
