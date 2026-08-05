import type { ApplyPackage } from "@/lib/auto-apply"
import { prisma } from "@/lib/prisma"

export async function getApplyPackageForJob(userId: string, jobId: string) {
  const application = await prisma.jobApplication.findFirst({
    where: { userId, jobId },
    select: {
      applyPackageJson: true,
      autoApplyStatus: true,
      status: true,
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          url: true,
          matchScore: true,
          source: true,
        },
      },
    },
  })

  if (application?.applyPackageJson) {
    return {
      applyPackage: application.applyPackageJson as ApplyPackage,
      status: application.status,
      autoApplyStatus: application.autoApplyStatus,
      source: "application" as const,
    }
  }

  const [cover, resume, user, job] = await Promise.all([
    prisma.jobDocument.findUnique({
      where: {
        userId_jobId_type: { userId, jobId, type: "cover_letter" },
      },
    }),
    prisma.jobDocument.findUnique({
      where: {
        userId_jobId_type: { userId, jobId, type: "tailored_resume" },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
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
    }),
    prisma.job.findFirst({
      where: { id: jobId, userId },
    }),
  ])

  if (!job || !user || !cover || !resume) {
    return null
  }

  const { buildCustomAnswers } = await import("@/lib/auto-apply-answers")
  const gap = job.gapAnalysisJson as import("@/lib/jobs/gap-analysis").GapAnalysis | null
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

  return {
    applyPackage,
    status: null,
    autoApplyStatus: null,
    source: "documents" as const,
  }
}

export async function findApplyPackageByUrl(userId: string, pageUrl: string) {
  const normalized = pageUrl.split("?")[0].replace(/\/$/, "")
  const jobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: { id: true, url: true },
  })

  const match = jobs.find((job) => {
    const jobUrl = job.url.split("?")[0].replace(/\/$/, "")
    return (
      normalized === jobUrl ||
      normalized.includes(jobUrl) ||
      jobUrl.includes(normalized)
    )
  })

  if (!match) {
    // Fall back to latest prepared package
    const latest = await prisma.jobApplication.findFirst({
      where: {
        userId,
        autoApplyStatus: { in: ["ready", "submitted"] },
      },
      orderBy: { autoPreparedAt: "desc" },
      select: { jobId: true, applyPackageJson: true },
    })
    if (!latest?.applyPackageJson) return null
    return getApplyPackageForJob(userId, latest.jobId)
  }

  return getApplyPackageForJob(userId, match.id)
}
