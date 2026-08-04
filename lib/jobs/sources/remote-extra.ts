import * as cheerio from "cheerio"
import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchText, isRemoteLocation } from "@/lib/jobs/sources/http"
import type { NormalizedJob } from "@/lib/jobs/types"

/** Working Nomads — developer-focused remote RSS feed. */
export async function fetchWorkingNomadsJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const xml = await fetchText(
    "https://www.workingnomads.com/jobs.atom?category=development",
    signal
  )
  const $ = cheerio.load(xml, { xml: true })
  const jobs: NormalizedJob[] = []

  $("entry").each((_, el) => {
    const title = $(el).find("title").first().text().trim()
    const url = $(el).find("link").attr("href") || $(el).find("id").text().trim()
    const summary = $(el).find("summary, content").first().text().trim()
    const published = $(el).find("published, updated").first().text().trim()
    const id = $(el).find("id").text().trim() || url

    if (!title || !url) return

    // Title format often: "Company: Role" or "Role at Company"
    let company: string | null = null
    let role = title
    if (title.includes(":")) {
      const [left, ...rest] = title.split(":")
      company = left.trim()
      role = rest.join(":").trim() || title
    } else if (/\sat\s/i.test(title)) {
      const parts = title.split(/\sat\s/i)
      role = parts[0]?.trim() || title
      company = parts.slice(1).join(" at ").trim() || null
    }

    const haystack = `${title} ${summary}`
    if (!matchesKeywords(haystack, keywords) && keywords.length > 0) {
      // Still keep engineering-ish roles from this feed
      if (!/engineer|developer|software|devops|data|ml|frontend|backend/i.test(haystack)) {
        return
      }
    }

    jobs.push({
      externalId: id.replace(/\W+/g, "_").slice(0, 120),
      source: "workingnomads",
      sourceCategory: "remote_board",
      title: role,
      company,
      location: "Worldwide Remote",
      isRemote: true,
      url,
      description: summary || null,
      salary: null,
      tags: ["remote", "development"],
      postedAt: published ? new Date(published) : null,
    })
  })

  return jobs
}

/** JustRemote — scrape public remote developer listing page lightly. */
export async function fetchJustRemoteJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const html = await fetchText(
    "https://justremote.co/remote-developer-jobs",
    signal
  )
  const $ = cheerio.load(html)
  const jobs: NormalizedJob[] = []
  const seen = new Set<string>()

  $("a[href*='/remote-jobs/']").each((_, el) => {
    const href = $(el).attr("href")
    if (!href || seen.has(href)) return
    const title = $(el).text().replace(/\s+/g, " ").trim()
    if (!title || title.length < 4 || title.length > 160) return
    if (/view all|see more|browse/i.test(title)) return

    const url = href.startsWith("http") ? href : `https://justremote.co${href}`
    const haystack = title
    if (
      keywords.length > 0 &&
      !matchesKeywords(haystack, keywords) &&
      !/engineer|developer|software|devops|data|frontend|backend|full.?stack/i.test(
        haystack
      )
    ) {
      return
    }

    seen.add(href)
    jobs.push({
      externalId: href.replace(/\W+/g, "_").slice(0, 120),
      source: "justremote",
      sourceCategory: "remote_board",
      title,
      company: null,
      location: "Remote",
      isRemote: true,
      url,
      description: null,
      salary: null,
      tags: ["remote"],
      postedAt: null,
    })
  })

  return jobs.slice(0, 80)
}

/** Remote.co — remote software category listing. */
export async function fetchRemoteCoJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const html = await fetchText(
    "https://remote.co/remote-jobs/developer/",
    signal
  )
  const $ = cheerio.load(html)
  const jobs: NormalizedJob[] = []
  const seen = new Set<string>()

  $("a[href*='/job/'], a[href*='/remote-jobs/job/']").each((_, el) => {
    const href = $(el).attr("href")
    if (!href || seen.has(href)) return
    const card = $(el).closest("li, article, .card, .job_listing, tr")
    const title =
      $(el).text().replace(/\s+/g, " ").trim() ||
      card.find("h2, h3, .job_title").first().text().replace(/\s+/g, " ").trim()
    if (!title || title.length < 4) return

    const company =
      card.find(".company, .company_name, .employer").first().text().trim() ||
      null
    const location =
      card.find(".location").first().text().trim() || "Fully Remote"
    const url = href.startsWith("http") ? href : `https://remote.co${href}`

    if (
      keywords.length > 0 &&
      !matchesKeywords(`${title} ${company ?? ""}`, keywords)
    ) {
      if (!/engineer|developer|software|devops|data|frontend|backend/i.test(title)) {
        return
      }
    }

    seen.add(href)
    jobs.push({
      externalId: href.replace(/\W+/g, "_").slice(0, 120),
      source: "remoteco",
      sourceCategory: "remote_board",
      title,
      company,
      location,
      isRemote: isRemoteLocation(location, title),
      url,
      description: null,
      salary: null,
      tags: ["remote"],
      postedAt: null,
    })
  })

  return jobs.slice(0, 80)
}
