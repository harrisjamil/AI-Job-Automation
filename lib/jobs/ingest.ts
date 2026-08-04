import { prisma } from "@/lib/prisma"
import { getActiveAiPlatform } from "@/lib/ai/client"
import { fetchAllJobSources } from "@/lib/jobs/sources"
import { dedupeJobs } from "@/lib/jobs/dedupe"
import {
  expandSearchKeywords,
  MIN_MATCH_SCORE,
  scoreAndRankJobs,
} from "@/lib/jobs/match"
import { normalizeJob } from "@/lib/jobs/normalize"
import { isFreshJob, MAX_JOB_AGE_DAYS } from "@/lib/jobs/relevance"
import type { ProfileSearchContext } from "@/lib/jobs/types"

const CRAWL_TIMEOUT_MS = 110_000

export async function loadProfileSearchContext(
  userId: string
): Promise<ProfileSearchContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      experienceYears: true,
      careerGoal: true,
      preferredTechStack: true,
      primaryRole: true,
      skills: { select: { skill: { select: { name: true } } } },
      jobPreferences: true,
      projects: { select: { techStack: true } },
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  const projectTech = user.projects.flatMap((project) => project.techStack)
  const prefs = user.jobPreferences

  return {
    skills: user.skills.map((item) => item.skill.name),
    roles: [
      ...(prefs?.targetRoles ?? []),
      ...(user.primaryRole ? [user.primaryRole] : []),
    ],
    keywords: prefs?.includeKeywords ?? [],
    excludeKeywords: prefs?.excludeKeywords ?? [],
    techStack: [...(user.preferredTechStack ?? []), ...projectTech],
    remoteOnly: prefs?.remoteOnly ?? true,
    experienceYears: user.experienceYears,
    careerGoal: user.careerGoal,
  }
}

export async function runJobCrawl(userId: string) {
  const profile = await loadProfileSearchContext(userId)

  const hasSignal =
    profile.roles.length > 0 ||
    profile.keywords.length > 0 ||
    profile.techStack.length > 0 ||
    profile.skills.length > 0

  if (!hasSignal) {
    throw new Error(
      "Add target roles, skills, or keywords in your Profile before running a global search."
    )
  }

  if (profile.roles.length === 0 && profile.keywords.length === 0) {
    throw new Error(
      "Add at least one target role (or include keywords) in Profile so matching can stay precise. Skills alone are too broad."
    )
  }

  const platform = await getActiveAiPlatform(userId)
  const keywords = await expandSearchKeywords(profile, platform)

  const crawlRun = await prisma.crawlRun.create({
    data: {
      userId,
      status: "running",
      keywords,
      sources: [],
    },
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS)

  try {
    const sourceResults = await fetchAllJobSources(keywords, controller.signal)
    clearTimeout(timer)

    const usedSources = sourceResults
      .filter((result) => result.jobs.length > 0)
      .map((result) => result.source)

    let collected = sourceResults
      .flatMap((result) => result.jobs)
      .map(normalizeJob)

    // Drop stale listings before scoring
    collected = collected.filter((job) => isFreshJob(job))

    if (profile.remoteOnly) {
      collected = collected.filter(
        (job) =>
          job.isRemote ||
          /remote|worldwide|anywhere|global|distributed/i.test(
            `${job.title} ${job.location ?? ""} ${job.description ?? ""}`
          )
      )
    }

    for (const exclude of profile.excludeKeywords) {
      const needle = exclude.toLowerCase()
      collected = collected.filter((job) => {
        const haystack =
          `${job.title} ${job.company ?? ""} ${job.description ?? ""}`.toLowerCase()
        return !haystack.includes(needle)
      })
    }

    collected = dedupeJobs(collected)

    const ranked = await scoreAndRankJobs(
      collected,
      profile,
      keywords,
      userId
    )

    const toSave = ranked
      .filter((job) => job.matchScore >= MIN_MATCH_SCORE)
      .slice(0, 150)

    let saved = 0
    for (const job of toSave) {
      await prisma.job.upsert({
        where: {
          userId_source_externalId: {
            userId,
            source: job.source,
            externalId: job.externalId,
          },
        },
        create: {
          userId,
          crawlRunId: crawlRun.id,
          companyId: job.companyId ?? null,
          externalId: job.externalId,
          source: job.source,
          sourceCategory: job.sourceCategory ?? "remote_board",
          title: job.title,
          company: job.company,
          location: job.location,
          isRemote: job.isRemote,
          url: job.url,
          description: job.description?.slice(0, 50000) ?? null,
          salary: job.salary,
          tags: job.tags ?? [],
          fingerprint: job.fingerprint ?? null,
          skillsMatched: job.skillsMatched,
          matchScore: job.matchScore,
          postedAt: job.postedAt,
        },
        update: {
          crawlRunId: crawlRun.id,
          companyId: job.companyId ?? null,
          sourceCategory: job.sourceCategory ?? "remote_board",
          title: job.title,
          company: job.company,
          location: job.location,
          isRemote: job.isRemote,
          url: job.url,
          description: job.description?.slice(0, 50000) ?? null,
          salary: job.salary,
          tags: job.tags ?? [],
          fingerprint: job.fingerprint ?? null,
          skillsMatched: job.skillsMatched,
          matchScore: job.matchScore,
          postedAt: job.postedAt,
          scrapedAt: new Date(),
        },
      })
      saved += 1
    }

    // Remove outdated / weak leftovers from previous crawls
    const staleCutoff = new Date(
      Date.now() - MAX_JOB_AGE_DAYS * 24 * 60 * 60 * 1000
    )
    await prisma.job.deleteMany({
      where: {
        userId,
        OR: [
          { postedAt: { lt: staleCutoff } },
          {
            AND: [
              { postedAt: null },
              {
                scrapedAt: {
                  lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                },
              },
            ],
          },
          { matchScore: { lt: MIN_MATCH_SCORE } },
        ],
      },
    })

    await Promise.allSettled(
      sourceResults.map((result) =>
        prisma.jobSource.updateMany({
          where: { key: result.source },
          data: {
            lastCrawlAt: new Date(),
            lastStatus: result.error ? "error" : "ok",
            lastError: result.error ?? null,
            jobsFound: result.jobs.length,
          },
        })
      )
    )

    const sourceErrors = sourceResults
      .filter((result) => result.error)
      .map((result) => `${result.source}: ${result.error}`)

    const finished = await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "completed",
        sources: usedSources,
        jobsFound: saved,
        finishedAt: new Date(),
        error: sourceErrors.length > 0 ? sourceErrors.join("; ") : null,
      },
    })

    // Fire-and-forget high-score digest (does not fail the crawl)
    void import("@/lib/email/alerts")
      .then(({ sendHighScoreJobAlerts }) =>
        sendHighScoreJobAlerts(userId, crawlRun.id)
      )
      .catch((error) => {
        console.error("Alert dispatch failed:", error)
      })

    // Fire-and-forget auto-apply prep for high-score jobs when enabled
    void import("@/lib/auto-apply")
      .then(({ maybeAutoApplyAfterCrawl }) =>
        maybeAutoApplyAfterCrawl(userId, crawlRun.id)
      )
      .catch((error) => {
        console.error("Auto-apply after crawl failed:", error)
      })

    return finished
  } catch (error) {
    clearTimeout(timer)
    const message =
      error instanceof Error ? error.message : "Crawl failed unexpectedly"

    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: message,
      },
    })

    throw error
  }
}
