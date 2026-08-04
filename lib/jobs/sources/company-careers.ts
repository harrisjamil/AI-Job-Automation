import {
  filterEngineeringJobs,
  fetchJson,
  isRemoteLocation,
} from "@/lib/jobs/sources/ats-shared"
import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchText } from "@/lib/jobs/sources/http"
import * as cheerio from "cheerio"
import type { NormalizedJob } from "@/lib/jobs/types"

/**
 * Direct career-page / startup / AI-lab sources beyond shared ATS board tokens.
 */
export async function fetchCompanyCareerJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const results = await Promise.allSettled([
    fetchYcJobs(keywords, signal),
    fetchOttaPublic(keywords, signal),
    fetchAiJobsBoard(keywords, signal),
  ])

  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  )
}

/** Y Combinator jobs listing (HTML). */
async function fetchYcJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const html = await fetchText("https://www.ycombinator.com/jobs", signal)
  const $ = cheerio.load(html)
  const jobs: NormalizedJob[] = []
  const seen = new Set<string>()

  $("a[href*='/companies/']").each((_, el) => {
    const href = $(el).attr("href")
    if (!href || !href.includes("jobs") || seen.has(href)) return
    const title = $(el).text().replace(/\s+/g, " ").trim()
    if (!title || title.length < 5 || title.length > 180) return
    if (
      keywords.length > 0 &&
      !matchesKeywords(title, keywords) &&
      !/engineer|developer|software|fullstack|backend|frontend|ml|ai/i.test(title)
    ) {
      return
    }
    seen.add(href)
    jobs.push({
      externalId: href.replace(/\W+/g, "_").slice(0, 120),
      source: "yc",
      sourceCategory: "startup_board",
      title,
      company: null,
      location: null,
      isRemote: /remote/i.test(title),
      url: href.startsWith("http") ? href : `https://www.ycombinator.com${href}`,
      description: null,
      salary: null,
      tags: ["yc", "startup"],
      postedAt: null,
    })
  })

  return jobs.slice(0, 80)
}

/** Welcome to the Jungle (Otta successor) — public jobs API when available. */
async function fetchOttaPublic(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  try {
    const query = encodeURIComponent(
      keywords.slice(0, 2).join(" ") || "software engineer"
    )
    const data = await fetchJson<{
      jobs?: Array<{
        id?: string | number
        name?: string
        slug?: string
        company?: { name?: string }
        office?: { city?: string; country?: { name?: string } }
        remote?: boolean
        published_at?: string
        description?: string
        url?: string
      }>
    }>(
      `https://www.welcometothejungle.com/api/v1/jobs?query=${query}&page=1&per_page=40`,
      signal
    )

    const list = Array.isArray(data.jobs) ? data.jobs : []
    const jobs = list
      .filter((item) => item.id && item.name)
      .map((item) => {
        const location = [item.office?.city, item.office?.country?.name]
          .filter(Boolean)
          .join(", ")
        return {
          externalId: String(item.id),
          source: "otta",
          sourceCategory: "startup_board" as const,
          title: item.name!,
          company: item.company?.name ?? null,
          location: location || null,
          isRemote: Boolean(item.remote) || isRemoteLocation(location),
          url:
            item.url ||
            `https://www.welcometothejungle.com/en/jobs/${item.slug ?? item.id}`,
          description: item.description ?? null,
          salary: null,
          tags: ["startup"],
          postedAt: item.published_at ? new Date(item.published_at) : null,
        } satisfies NormalizedJob
      })

    return filterEngineeringJobs(jobs, keywords)
  } catch {
    return []
  }
}

/** AI Jobs board listing. */
async function fetchAiJobsBoard(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  try {
    const html = await fetchText("https://ai-jobs.net/", signal)
    const $ = cheerio.load(html)
    const jobs: NormalizedJob[] = []
    const seen = new Set<string>()

    $("a[href*='/job/']").each((_, el) => {
      const href = $(el).attr("href")
      if (!href || seen.has(href)) return
      const title = $(el).text().replace(/\s+/g, " ").trim()
      if (!title || title.length < 5 || title.length > 160) return
      if (
        keywords.length > 0 &&
        !matchesKeywords(title, keywords) &&
        !/ml|ai|machine|data|engineer|research|llm/i.test(title)
      ) {
        return
      }

      seen.add(href)
      jobs.push({
        externalId: href.replace(/\W+/g, "_").slice(0, 120),
        source: "aijobs",
        sourceCategory: "ai_ml",
        title,
        company: null,
        location: "Remote / Hybrid",
        isRemote: true,
        url: href.startsWith("http") ? href : `https://ai-jobs.net${href}`,
        description: null,
        salary: null,
        tags: ["ai", "ml"],
        postedAt: null,
      })
    })

    return jobs.slice(0, 60)
  } catch {
    return []
  }
}
