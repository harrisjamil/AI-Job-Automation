import * as cheerio from "cheerio"
import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchText, isRemoteLocation } from "@/lib/jobs/sources/http"
import type { NormalizedJob } from "@/lib/jobs/types"

const FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
]

function parseTitle(raw: string): { company: string | null; title: string } {
  const cleaned = raw.replace(/\s+/g, " ").trim()
  const idx = cleaned.indexOf(":")
  if (idx > 0 && idx < cleaned.length - 1) {
    return {
      company: cleaned.slice(0, idx).trim() || null,
      title: cleaned.slice(idx + 1).trim(),
    }
  }
  return { company: null, title: cleaned }
}

export async function fetchWeWorkRemotelyJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const xmlChunks = await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        return await fetchText(feed, signal)
      } catch {
        return ""
      }
    })
  )

  const jobs: NormalizedJob[] = []
  const seen = new Set<string>()

  for (const xml of xmlChunks) {
    if (!xml) continue
    const $ = cheerio.load(xml, { xml: true })

    $("item").each((_, el) => {
      const rawTitle = $(el).find("title").first().text().trim()
      const link = $(el).find("link").first().text().trim()
      const description = $(el).find("description").first().text().trim()
      const region = $(el).find("region").first().text().trim()
      const category = $(el).find("category").first().text().trim()
      const pubDate = $(el).find("pubDate").first().text().trim()

      if (!rawTitle || !link) return

      const { company, title } = parseTitle(rawTitle)
      const externalId =
        link.replace(/^https?:\/\/weworkremotely\.com\//i, "").replace(/\W+/g, "-") ||
        link

      if (seen.has(externalId)) return

      const haystack = [title, company, region, category, description]
        .filter(Boolean)
        .join(" ")

      if (!matchesKeywords(haystack, keywords)) return

      seen.add(externalId)
      jobs.push({
        externalId,
        source: "weworkremotely",
        title,
        company,
        location: region || "Worldwide Remote",
        isRemote: true,
        url: link,
        description: description || null,
        salary: null,
        tags: category ? [category] : [],
        postedAt: pubDate ? new Date(pubDate) : null,
      })
    })
  }

  // Prefer remote-sounding listings when keyword soft-match is broad
  return jobs.filter(
    (job) =>
      job.isRemote ||
      isRemoteLocation(job.location, job.title, job.description)
  )
}
