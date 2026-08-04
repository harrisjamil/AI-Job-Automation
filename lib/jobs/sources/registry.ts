import type { JobSourceCategory, NormalizedJob } from "@/lib/jobs/types"
import { fetchAdzunaJobs } from "@/lib/jobs/sources/adzuna"
import { fetchArbeitnowJobs } from "@/lib/jobs/sources/arbeitnow"
import { fetchAshbyJobs } from "@/lib/jobs/sources/ashby"
import { fetchCompanyCareerJobs } from "@/lib/jobs/sources/company-careers"
import { fetchGreenhouseJobs } from "@/lib/jobs/sources/greenhouse"
import { fetchHimalayasJobs } from "@/lib/jobs/sources/himalayas"
import { fetchJobicyJobs } from "@/lib/jobs/sources/jobicy"
import { fetchLeverJobs } from "@/lib/jobs/sources/lever"
import { fetchNomado24Jobs } from "@/lib/jobs/sources/nomado24"
import {
  fetchJustRemoteJobs,
  fetchRemoteCoJobs,
  fetchWorkingNomadsJobs,
} from "@/lib/jobs/sources/remote-extra"
import { fetchRemoteOkJobs } from "@/lib/jobs/sources/remoteok"
import { fetchRemoteJobsOrgJobs } from "@/lib/jobs/sources/remotejobs-org"
import { fetchRemotiveJobs } from "@/lib/jobs/sources/remotive"
import { fetchSmartRecruitersJobs } from "@/lib/jobs/sources/smartrecruiters"
import { fetchTheMuseJobs } from "@/lib/jobs/sources/themuse"
import { fetchWeWorkRemotelyJobs } from "@/lib/jobs/sources/weworkremotely"
import { fetchWorkableJobs } from "@/lib/jobs/sources/workable"
import { fetchWorkdayJobs } from "@/lib/jobs/sources/workday"

export type SourceDefinition = {
  key: string
  name: string
  category: JobSourceCategory
  /** Higher runs first when merging before soft-dedupe. */
  priority: number
  enabled: boolean
  crawlMethod: "api" | "rss" | "html" | "hybrid"
  description: string
  run: (keywords: string[], signal?: AbortSignal) => Promise<NormalizedJob[]>
}

/**
 * Multi-source registry ordered by recommended crawl priority:
 * ATS → remote boards → company/startup → general.
 */
export const SOURCE_REGISTRY: SourceDefinition[] = [
  // ── ATS (highest priority) ──────────────────────────────────────────
  {
    key: "greenhouse",
    name: "Greenhouse",
    category: "ats",
    priority: 100,
    enabled: true,
    crawlMethod: "api",
    description: "Public ATS boards (Stripe, Discord, Airbnb, GitLab, …)",
    run: fetchGreenhouseJobs,
  },
  {
    key: "lever",
    name: "Lever",
    category: "ats",
    priority: 99,
    enabled: true,
    crawlMethod: "api",
    description: "Public Lever postings (Netflix, Canva, Shopify, …)",
    run: fetchLeverJobs,
  },
  {
    key: "ashby",
    name: "Ashby",
    category: "ats",
    priority: 98,
    enabled: true,
    crawlMethod: "api",
    description: "Modern startup ATS (Vercel, OpenAI, Linear, …)",
    run: fetchAshbyJobs,
  },
  {
    key: "workday",
    name: "Workday",
    category: "ats",
    priority: 95,
    enabled: true,
    crawlMethod: "api",
    description: "Fortune 500 Workday CXS boards (NVIDIA, Salesforce, Adobe)",
    run: fetchWorkdayJobs,
  },
  {
    key: "smartrecruiters",
    name: "SmartRecruiters",
    category: "ats",
    priority: 90,
    enabled: true,
    crawlMethod: "api",
    description: "Enterprise SmartRecruiters company boards",
    run: fetchSmartRecruitersJobs,
  },
  {
    key: "workable",
    name: "Workable",
    category: "ats",
    priority: 89,
    enabled: true,
    crawlMethod: "api",
    description: "Workable widget boards (Docker, Hugging Face, …)",
    run: fetchWorkableJobs,
  },

  // ── Remote job boards ───────────────────────────────────────────────
  {
    key: "weworkremotely",
    name: "We Work Remotely",
    category: "remote_board",
    priority: 85,
    enabled: true,
    crawlMethod: "rss",
    description: "Remote tech RSS feeds",
    run: fetchWeWorkRemotelyJobs,
  },
  {
    key: "remotive",
    name: "Remotive",
    category: "remote_board",
    priority: 84,
    enabled: true,
    crawlMethod: "api",
    description: "Remote engineering API",
    run: fetchRemotiveJobs,
  },
  {
    key: "himalayas",
    name: "Himalayas",
    category: "remote_board",
    priority: 83,
    enabled: true,
    crawlMethod: "api",
    description: "Worldwide remote search API",
    run: fetchHimalayasJobs,
  },
  {
    key: "jobicy",
    name: "Jobicy",
    category: "remote_board",
    priority: 82,
    enabled: true,
    crawlMethod: "api",
    description: "Remote jobs API v2",
    run: fetchJobicyJobs,
  },
  {
    key: "remoteok",
    name: "Remote OK",
    category: "remote_board",
    priority: 81,
    enabled: true,
    crawlMethod: "api",
    description: "Developer-focused remote JSON feed",
    run: fetchRemoteOkJobs,
  },
  {
    key: "remoteco",
    name: "Remote.co",
    category: "remote_board",
    priority: 78,
    enabled: true,
    crawlMethod: "html",
    description: "Fully remote developer listings",
    run: fetchRemoteCoJobs,
  },
  {
    key: "justremote",
    name: "JustRemote",
    category: "remote_board",
    priority: 77,
    enabled: true,
    crawlMethod: "html",
    description: "Global remote developer jobs",
    run: fetchJustRemoteJobs,
  },
  {
    key: "workingnomads",
    name: "Working Nomads",
    category: "remote_board",
    priority: 76,
    enabled: true,
    crawlMethod: "rss",
    description: "Developer Atom feed",
    run: fetchWorkingNomadsJobs,
  },
  {
    key: "arbeitnow",
    name: "Arbeitnow",
    category: "remote_board",
    priority: 74,
    enabled: true,
    crawlMethod: "api",
    description: "EU/remote tech board",
    run: fetchArbeitnowJobs,
  },
  {
    key: "remotejobsorg",
    name: "RemoteJobs.org",
    category: "remote_board",
    priority: 73,
    enabled: true,
    crawlMethod: "api",
    description: "Remote jobs API",
    run: fetchRemoteJobsOrgJobs,
  },
  {
    key: "nomado24",
    name: "Nomado24",
    category: "remote_board",
    priority: 72,
    enabled: true,
    crawlMethod: "api",
    description: "EU/EMEA remote roles",
    run: fetchNomado24Jobs,
  },

  // ── Company careers + startup + AI boards ───────────────────────────
  {
    key: "company_careers",
    name: "Company & Startup Boards",
    category: "company_careers",
    priority: 70,
    enabled: true,
    crawlMethod: "hybrid",
    description: "YC Jobs, Otta/WTTJ, AI Jobs, career pages",
    run: fetchCompanyCareerJobs,
  },
  {
    key: "themuse",
    name: "The Muse",
    category: "general",
    priority: 60,
    enabled: true,
    crawlMethod: "api",
    description: "Software/data/UX categories",
    run: fetchTheMuseJobs,
  },
  {
    key: "adzuna",
    name: "Adzuna",
    category: "general",
    priority: 50,
    enabled: true,
    crawlMethod: "api",
    description: "Multi-country aggregator (requires API keys)",
    run: async (keywords, signal) => {
      if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
        throw new Error(
          "Skipped — add ADZUNA_APP_ID and ADZUNA_APP_KEY to .env (free at developer.adzuna.com)"
        )
      }
      return fetchAdzunaJobs(keywords, signal)
    },
  },
]

export const JOB_SOURCE_NAMES = SOURCE_REGISTRY.map((s) => s.key)

export function getSourcesByCategory() {
  const groups = new Map<JobSourceCategory, SourceDefinition[]>()
  for (const source of SOURCE_REGISTRY) {
    const list = groups.get(source.category) ?? []
    list.push(source)
    groups.set(source.category, list)
  }
  return groups
}

export type SourceResult = {
  source: string
  category: JobSourceCategory
  jobs: NormalizedJob[]
  error?: string
}

export async function fetchAllJobSources(
  keywords: string[],
  signal?: AbortSignal,
  options?: { categories?: JobSourceCategory[]; keys?: string[] }
): Promise<SourceResult[]> {
  const enabled = SOURCE_REGISTRY.filter((source) => {
    if (!source.enabled) return false
    if (options?.keys?.length && !options.keys.includes(source.key)) return false
    if (
      options?.categories?.length &&
      !options.categories.includes(source.category)
    ) {
      return false
    }
    return true
  }).sort((a, b) => b.priority - a.priority)

  const settled = await Promise.allSettled(
    enabled.map((source) => source.run(keywords, signal))
  )

  return settled.map((result, index) => {
    const source = enabled[index]
    if (result.status === "fulfilled") {
      const jobs = result.value.map((job) => ({
        ...job,
        source: job.source || source.key,
        sourceCategory: job.sourceCategory ?? source.category,
      }))
      return { source: source.key, category: source.category, jobs }
    }
    return {
      source: source.key,
      category: source.category,
      jobs: [],
      error:
        result.reason instanceof Error
          ? result.reason.message
          : "Source fetch failed",
    }
  })
}
