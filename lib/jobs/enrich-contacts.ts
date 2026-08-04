import * as cheerio from "cheerio"
import {
  extractJsonArray,
  generateAiText,
  getActiveAiPlatform,
} from "@/lib/ai/client"
import { prisma } from "@/lib/prisma"

const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

const OBFUSCATED_EMAIL_REGEX =
  /([a-zA-Z0-9._%+-]+)\s*(?:\[|\()?at(?:\]|\))?\s*([a-zA-Z0-9.-]+)\s*(?:\[|\()?dot(?:\]|\))?\s*([a-zA-Z]{2,})/gi

const BLOCKED_EMAIL_DOMAINS = new Set([
  "example.com",
  "email.com",
  "domain.com",
  "sentry.io",
  "wixpress.com",
  "cloudflare.com",
  "schema.org",
  "github.com",
  "gravatar.com",
  "linkedin.com",
  "google.com",
  "googleapis.com",
])

function isLikelyEmail(email: string): boolean {
  const lower = email.toLowerCase()
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".webp")
  ) {
    return false
  }
  const domain = lower.split("@")[1]
  if (!domain || BLOCKED_EMAIL_DOMAINS.has(domain)) return false
  if (
    lower.includes("noreply") ||
    lower.includes("no-reply") ||
    lower.includes("donotreply") ||
    lower.startsWith("mailer-daemon")
  ) {
    return false
  }
  return true
}

function extractEmailsFromText(text: string): string[] {
  const unique = new Set<string>()

  const normalized = text
    .replace(OBFUSCATED_EMAIL_REGEX, "$1@$2.$3")
    .replace(/\s+@\s+/g, "@")

  for (const match of normalized.match(EMAIL_REGEX) ?? []) {
    const email = match.toLowerCase()
    if (isLikelyEmail(email)) unique.add(email)
  }

  return [...unique]
}

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch page (${response.status})`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Keep structured data / JSON blobs that often hold contact emails
    const jsonLd = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).html() ?? "")
      .get()
      .join("\n")

    const mailto = $("a[href^='mailto:']")
      .map((_, el) => {
        const href = $(el).attr("href") ?? ""
        return href.replace(/^mailto:/i, "").split("?")[0]
      })
      .get()
      .join(" ")

    $("script, style, noscript, svg").remove()
    const text = $("body").text().replace(/\s+/g, " ").trim()
    const meta = [
      $('meta[name="description"]').attr("content"),
      $('meta[property="og:description"]').attr("content"),
    ]
      .filter(Boolean)
      .join(" ")

    return `${mailto}\n${jsonLd}\n${meta}\n${text}`.slice(0, 50000)
  } finally {
    clearTimeout(timer)
  }
}

function companySlug(company: string | null | undefined): string | null {
  if (!company) return null
  const slug = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim()
  return slug.length >= 3 ? slug : null
}

export async function enrichJobContacts(jobId: string, userId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
  })

  if (!job) {
    throw new Error("Job not found")
  }

  let pageText = ""
  try {
    pageText = await fetchPageText(job.url)
  } catch {
    pageText = ""
  }

  const descriptionText = (job.description ?? "").replace(/<[^>]+>/g, " ")
  const combined = `${pageText}\n${descriptionText}`
  const regexEmails = extractEmailsFromText(combined)

  const contacts: Array<{
    email: string
    name: string | null
    role: string | null
    confidence: number
    sourceUrl: string
  }> = regexEmails.map((email) => ({
    email,
    name: null,
    role: null,
    confidence: 0.55,
    sourceUrl: job.url,
  }))

  const platform = await getActiveAiPlatform(userId)
  if (platform && combined.length > 80) {
    try {
      const slug = companySlug(job.company)
      const output = await generateAiText({
        platform,
        maxTokens: 600,
        system:
          "Extract recruiter/hiring contact emails from job page text. Prefer careers@, jobs@, hiring@, talent@, recruiters, and named people. Reply JSON array of {email,name,role,confidence} only. Skip noreply, privacy, and support-only addresses. Never invent emails that are not present or strongly implied in the text.",
        prompt: `Job: ${job.title} at ${job.company ?? "Unknown"}
URL: ${job.url}
${slug ? `Company slug hint: ${slug}` : ""}

Text:
${combined.slice(0, 10000)}

Return contacts found. confidence 0-1. JSON array only.`,
      })

      const parsed = extractJsonArray(output) as Array<{
        email?: string
        name?: string
        role?: string
        confidence?: number
      }>

      for (const item of parsed) {
        const email = String(item.email ?? "")
          .trim()
          .toLowerCase()
        if (!email || !isLikelyEmail(email)) continue
        const existing = contacts.find((c) => c.email === email)
        if (existing) {
          existing.name = item.name ? String(item.name) : existing.name
          existing.role = item.role ? String(item.role) : existing.role
          existing.confidence = Math.max(
            existing.confidence,
            Number(item.confidence) || 0.7
          )
        } else {
          contacts.push({
            email,
            name: item.name ? String(item.name) : null,
            role: item.role ? String(item.role) : null,
            confidence: Math.min(1, Number(item.confidence) || 0.7),
            sourceUrl: job.url,
          })
        }
      }
    } catch {
      // Keep regex contacts
    }
  }

  const saved = []
  for (const contact of contacts) {
    const row = await prisma.jobContact.upsert({
      where: {
        jobId_email: {
          jobId: job.id,
          email: contact.email,
        },
      },
      create: {
        jobId: job.id,
        email: contact.email,
        name: contact.name,
        role: contact.role,
        confidence: contact.confidence,
        sourceUrl: contact.sourceUrl,
      },
      update: {
        name: contact.name,
        role: contact.role,
        confidence: contact.confidence,
        sourceUrl: contact.sourceUrl,
      },
    })
    saved.push(row)
  }

  return saved
}

export async function enrichJobsBatch(
  userId: string,
  options?: { limit?: number; minScore?: number }
) {
  const limit = options?.limit ?? 12
  const minScore = options?.minScore ?? 12

  const jobs = await prisma.job.findMany({
    where: {
      userId,
      matchScore: { gte: minScore },
      contacts: { none: {} },
    },
    orderBy: { matchScore: "desc" },
    take: limit,
    select: { id: true },
  })

  const results: Array<{ jobId: string; contacts: number; error?: string }> = []

  for (const job of jobs) {
    try {
      const contacts = await enrichJobContacts(job.id, userId)
      results.push({ jobId: job.id, contacts: contacts.length })
    } catch (error) {
      results.push({
        jobId: job.id,
        contacts: 0,
        error: error instanceof Error ? error.message : "Enrich failed",
      })
    }
  }

  return results
}
