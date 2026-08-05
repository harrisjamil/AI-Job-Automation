import type { Prisma } from "@/generated/prisma/client"
import {
  buildCustomAnswers,
  type CustomAnswer,
} from "@/lib/auto-apply-answers"
import { draftCoverLetter } from "@/lib/documents/cover-letter"
import { draftTailoredResume } from "@/lib/documents/tailor-resume"
import type { GapAnalysis } from "@/lib/jobs/gap-analysis"
import { prisma } from "@/lib/prisma"

export type ApplyPackage = {
  job: {
    id: string
    title: string
    company: string | null
    url: string
    matchScore: number
    source: string
  }
  coverLetter: {
    id: string
    title: string | null
    content: string
  }
  tailoredResume: {
    id: string
    title: string | null
    content: string
  }
  profileAnswers: {
    fullName: string
    email: string
    phone?: string
    linkedinUrl: string | null
    githubUrl: string | null
    portfolioUrl: string | null
    primaryRole: string | null
    experienceYears: number | null
    expectedSalary: number | null
    salaryPeriod: string | null
    noticePeriod: string | null
    workPreference: string | null
    country: string | null
    city: string | null
  }
  /** Answers for common ATS custom questions */
  customAnswers: CustomAnswer[]
  checklist: string[]
}

function buildChecklist(pkg: ApplyPackage): string[] {
  return [
    `Open the posting: ${pkg.job.url}`,
    "Paste your tailored resume into the resume/CV upload or text field",
    "Paste the cover letter into the cover letter / additional info field",
    `Confirm name (${pkg.profileAnswers.fullName}) and email (${pkg.profileAnswers.email})`,
    pkg.profileAnswers.linkedinUrl
      ? `Add LinkedIn: ${pkg.profileAnswers.linkedinUrl}`
      : "Add LinkedIn URL if requested",
    pkg.profileAnswers.expectedSalary
      ? `Salary expectation: ${pkg.profileAnswers.expectedSalary}${pkg.profileAnswers.salaryPeriod ? ` / ${pkg.profileAnswers.salaryPeriod}` : ""}`
      : "Fill salary expectation if asked",
    "Upload the resume PDF if the form has a file field (extension can assist)",
    "Submit the application on the employer site",
    "Click Mark submitted in the Chrome extension (or confirm Applied in the tracker)",
  ]
}

export async function runAutoApply(options: {
  userId: string
  jobId: string
  markApplied?: boolean
  followUpDays?: number
  regenerateDocuments?: boolean
}) {
  const job = await prisma.job.findFirst({
    where: { id: options.jobId, userId: options.userId },
  })
  if (!job) {
    throw new Error("Job not found")
  }

  const prefs = await prisma.jobPreferences.findUnique({
    where: { userId: options.userId },
  })

  const markApplied =
    options.markApplied ?? prefs?.autoApplyMarkApplied ?? true
  const followUpDays =
    options.followUpDays ?? prefs?.autoApplyFollowUpDays ?? 7

  // Mark preparing
  await prisma.jobApplication.upsert({
    where: { jobId: job.id },
    create: {
      userId: options.userId,
      jobId: job.id,
      status: "saved",
      autoApplyStatus: "preparing",
      autoApplyError: null,
    },
    update: {
      autoApplyStatus: "preparing",
      autoApplyError: null,
    },
  })

  try {
    let cover = await prisma.jobDocument.findUnique({
      where: {
        userId_jobId_type: {
          userId: options.userId,
          jobId: job.id,
          type: "cover_letter",
        },
      },
    })
    let resume = await prisma.jobDocument.findUnique({
      where: {
        userId_jobId_type: {
          userId: options.userId,
          jobId: job.id,
          type: "tailored_resume",
        },
      },
    })

    if (options.regenerateDocuments || !cover) {
      cover = await draftCoverLetter({
        userId: options.userId,
        jobId: job.id,
      })
    }
    if (options.regenerateDocuments || !resume) {
      resume = await draftTailoredResume({
        userId: options.userId,
        jobId: job.id,
      })
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: options.userId },
      select: {
        fullName: true,
        email: true,
        linkedinUrl: true,
        githubUrl: true,
        portfolioUrl: true,
        primaryRole: true,
        experienceYears: true,
        expectedSalary: true,
        salaryPeriod: true,
        noticePeriod: true,
        workPreference: true,
        country: true,
        city: true,
        careerGoal: true,
        preferredTechStack: true,
        englishLevel: true,
        degree: true,
        university: true,
        willingOverlapUsEu: true,
        skills: {
          select: { skill: { select: { name: true } } },
        },
      },
    })

    const gap = job.gapAnalysisJson as GapAnalysis | null

    const customAnswers = buildCustomAnswers({
      profile: {
        fullName: user.fullName,
        primaryRole: user.primaryRole,
        experienceYears: user.experienceYears,
        careerGoal: user.careerGoal,
        workPreference: user.workPreference,
        noticePeriod: user.noticePeriod,
        expectedSalary: user.expectedSalary,
        salaryPeriod: user.salaryPeriod,
        preferredTechStack: user.preferredTechStack ?? [],
        englishLevel: user.englishLevel,
        degree: user.degree,
        university: user.university,
        willingOverlapUsEu: user.willingOverlapUsEu,
        skills: user.skills.map((s) => s.skill.name),
      },
      coverLetter: cover.content,
      gap,
    })

    const applyPackage: ApplyPackage = {
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        url: job.url,
        matchScore: job.matchScore,
        source: job.source,
      },
      coverLetter: {
        id: cover.id,
        title: cover.title,
        content: cover.content,
      },
      tailoredResume: {
        id: resume.id,
        title: resume.title,
        content: resume.content,
      },
      profileAnswers: {
        fullName: user.fullName,
        email: user.email,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        portfolioUrl: user.portfolioUrl,
        primaryRole: user.primaryRole,
        experienceYears: user.experienceYears,
        expectedSalary: user.expectedSalary,
        salaryPeriod: user.salaryPeriod,
        noticePeriod: user.noticePeriod,
        workPreference: user.workPreference,
        country: user.country,
        city: user.city,
      },
      customAnswers,
      checklist: [],
    }
    applyPackage.checklist = buildChecklist(applyPackage)

    const now = new Date()
    const followUpAt =
      followUpDays > 0
        ? new Date(now.getTime() + followUpDays * 24 * 60 * 60 * 1000)
        : null

    const application = await prisma.jobApplication.upsert({
      where: { jobId: job.id },
      create: {
        userId: options.userId,
        jobId: job.id,
        status: markApplied ? "applied" : "saved",
        appliedAt: markApplied ? now : null,
        statusChangedAt: now,
        followUpAt,
        followUpRemindedAt: null,
        autoApplyStatus: markApplied ? "submitted" : "ready",
        autoApplyError: null,
        applyPackageJson: applyPackage as unknown as Prisma.InputJsonValue,
        autoPreparedAt: now,
        notes: `Auto-apply prepared for ${job.title}${job.company ? ` @ ${job.company}` : ""}`,
      },
      update: {
        ...(markApplied
          ? {
              status: "applied",
              appliedAt: now,
              statusChangedAt: now,
            }
          : {}),
        followUpAt: followUpAt ?? undefined,
        followUpRemindedAt: followUpAt ? null : undefined,
        autoApplyStatus: markApplied ? "submitted" : "ready",
        autoApplyError: null,
        applyPackageJson: applyPackage as unknown as Prisma.InputJsonValue,
        autoPreparedAt: now,
      },
    })

    return {
      application,
      applyPackage,
      applyUrl: job.url,
      markedApplied: markApplied,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Auto-apply failed"
    await prisma.jobApplication.upsert({
      where: { jobId: job.id },
      create: {
        userId: options.userId,
        jobId: job.id,
        status: "saved",
        autoApplyStatus: "failed",
        autoApplyError: message,
      },
      update: {
        autoApplyStatus: "failed",
        autoApplyError: message,
      },
    })
    throw error
  }
}

/**
 * Prepare auto-apply packages for eligible high-score jobs that are not yet applied.
 */
export async function runAutoApplyBatch(options: {
  userId: string
  jobIds?: string[]
  minScore?: number
  limit?: number
  regenerateDocuments?: boolean
}) {
  const prefs = await prisma.jobPreferences.findUnique({
    where: { userId: options.userId },
  })
  const minScore = options.minScore ?? prefs?.autoApplyMinScore ?? 70
  const limit = Math.min(options.limit ?? 5, 10)

  const jobs = await prisma.job.findMany({
    where: {
      userId: options.userId,
      ...(options.jobIds?.length
        ? { id: { in: options.jobIds } }
        : {
            matchScore: { gte: minScore },
            OR: [
              { application: null },
              {
                application: {
                  status: { in: ["saved", "outreach"] },
                  autoApplyStatus: { notIn: ["submitted", "ready"] },
                },
              },
            ],
          }),
    },
    orderBy: { matchScore: "desc" },
    take: limit,
    select: { id: true, title: true, matchScore: true },
  })

  const results: Array<{
    jobId: string
    title: string
    ok: boolean
    applyUrl?: string
    markedApplied?: boolean
    error?: string
  }> = []

  for (const job of jobs) {
    try {
      const result = await runAutoApply({
        userId: options.userId,
        jobId: job.id,
        regenerateDocuments: options.regenerateDocuments,
      })
      results.push({
        jobId: job.id,
        title: job.title,
        ok: true,
        applyUrl: result.applyUrl,
        markedApplied: result.markedApplied,
      })
    } catch (error) {
      results.push({
        jobId: job.id,
        title: job.title,
        ok: false,
        error: error instanceof Error ? error.message : "Failed",
      })
    }
  }

  return {
    minScore,
    attempted: results.length,
    succeeded: results.filter((r) => r.ok).length,
    results,
  }
}

/**
 * After a crawl, optionally prepare auto-apply packages for new high-score jobs.
 */
export async function maybeAutoApplyAfterCrawl(
  userId: string,
  crawlRunId: string
) {
  const prefs = await prisma.jobPreferences.findUnique({
    where: { userId },
  })
  if (!prefs?.autoApplyEnabled) {
    return { ran: false as const, reason: "disabled" as const }
  }

  const minScore = prefs.autoApplyMinScore ?? 70
  const jobs = await prisma.job.findMany({
    where: {
      userId,
      crawlRunId,
      matchScore: { gte: minScore },
      application: null,
    },
    orderBy: { matchScore: "desc" },
    take: 3,
    select: { id: true },
  })

  if (jobs.length === 0) {
    return { ran: false as const, reason: "no_jobs" as const }
  }

  const summary = await runAutoApplyBatch({
    userId,
    jobIds: jobs.map((j) => j.id),
    limit: jobs.length,
  })

  return { ran: true as const, ...summary }
}
