import {
  extractJsonObject,
  generateAiText,
  getActiveAiPlatform,
} from "@/lib/ai/client"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

export type GapAnalysis = {
  matchSummary: string
  overlappingSkills: string[]
  missingSkills: string[]
  rewriteBullets: string[]
  emphasize: string[]
  risks: string[]
  scoreHint: number
}

export async function analyzeJobGap(options: {
  userId: string
  jobId: string
}) {
  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: {
      fullName: true,
      primaryRole: true,
      experienceYears: true,
      careerGoal: true,
      preferredTechStack: true,
      skills: {
        select: { skill: { select: { name: true } }, level: true },
      },
      projects: {
        take: 5,
        select: { title: true, description: true, techStack: true },
      },
      resumes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { parsedJson: true },
      },
    },
  })

  const job = await prisma.job.findFirst({
    where: { id: options.jobId, userId: options.userId },
  })

  if (!user || !job) throw new Error("Job or user not found")

  const skillNames = user.skills.map((s) => s.skill.name)
  const parsed = user.resumes[0]?.parsedJson as
    | { skills?: string[]; summary?: string }
    | null
    | undefined
  const candidateSkills = [
    ...skillNames,
    ...(user.preferredTechStack ?? []),
    ...(parsed?.skills ?? []),
  ]
  const uniqueSkills = [...new Set(candidateSkills.map((s) => s.trim()).filter(Boolean))]

  const jobText = `${job.title} ${job.company ?? ""} ${job.skillsMatched.join(" ")} ${(job.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`

  const overlapping = uniqueSkills.filter((skill) =>
    jobText.toLowerCase().includes(skill.toLowerCase())
  )
  const missingFromMatched = job.skillsMatched.filter(
    (skill) =>
      !uniqueSkills.some((s) => s.toLowerCase() === skill.toLowerCase())
  )

  let analysis: GapAnalysis = {
    matchSummary: `You overlap on ${overlapping.length} skill(s) for ${job.title}. Focus rewrites on missing requirements and quantified impact.`,
    overlappingSkills: overlapping.slice(0, 12),
    missingSkills: missingFromMatched.slice(0, 12),
    rewriteBullets: [
      overlapping[0]
        ? `Lead with ${overlapping[0]} experience tied to ${job.title} outcomes`
        : `Lead with your strongest ${user.primaryRole ?? "role"} achievement`,
      missingFromMatched[0]
        ? `If honest, show adjacent experience toward ${missingFromMatched[0]}`
        : "Add 1–2 metrics (latency, revenue, users) to top bullets",
      "Mirror 2–3 keywords from the job description in your summary",
    ],
    emphasize: [
      user.primaryRole ?? "Core role fit",
      ...overlapping.slice(0, 3),
    ].filter(Boolean),
    risks: missingFromMatched.slice(0, 3).map(
      (skill) => `Job asks for ${skill} — address or de-emphasize carefully`
    ),
    scoreHint: Math.min(
      95,
      Math.max(
        30,
        job.matchScore +
          overlapping.length * 2 -
          missingFromMatched.length * 3
      )
    ),
  }

  const platform = await getActiveAiPlatform(options.userId)
  if (platform) {
    try {
      const output = await generateAiText({
        platform,
        maxTokens: 900,
        system:
          "Analyze candidate vs job gap. Return JSON only: {matchSummary, overlappingSkills:string[], missingSkills:string[], rewriteBullets:string[], emphasize:string[], risks:string[], scoreHint:number}. Be honest. No fake experience.",
        prompt: `Candidate: ${user.fullName}
Role: ${user.primaryRole ?? "n/a"}
Years: ${user.experienceYears ?? "n/a"}
Skills: ${uniqueSkills.join(", ") || "n/a"}
Projects: ${user.projects.map((p) => p.title).join(", ") || "n/a"}
Resume summary: ${parsed?.summary?.slice(0, 400) || "n/a"}

Job: ${job.title} @ ${job.company ?? "n/a"}
Matched: ${job.skillsMatched.join(", ") || "n/a"}
Description: ${(job.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 900)}

JSON only.`,
      })
      const parsedAi = extractJsonObject(output)
      if (parsedAi) {
        analysis = {
          matchSummary:
            typeof parsedAi.matchSummary === "string"
              ? parsedAi.matchSummary.slice(0, 600)
              : analysis.matchSummary,
          overlappingSkills: Array.isArray(parsedAi.overlappingSkills)
            ? parsedAi.overlappingSkills.map(String).slice(0, 16)
            : analysis.overlappingSkills,
          missingSkills: Array.isArray(parsedAi.missingSkills)
            ? parsedAi.missingSkills.map(String).slice(0, 16)
            : analysis.missingSkills,
          rewriteBullets: Array.isArray(parsedAi.rewriteBullets)
            ? parsedAi.rewriteBullets.map(String).slice(0, 8)
            : analysis.rewriteBullets,
          emphasize: Array.isArray(parsedAi.emphasize)
            ? parsedAi.emphasize.map(String).slice(0, 8)
            : analysis.emphasize,
          risks: Array.isArray(parsedAi.risks)
            ? parsedAi.risks.map(String).slice(0, 8)
            : analysis.risks,
          scoreHint:
            typeof parsedAi.scoreHint === "number"
              ? Math.round(parsedAi.scoreHint)
              : analysis.scoreHint,
        }
      }
    } catch {
      // keep heuristic
    }
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      gapAnalysisJson: analysis as unknown as Prisma.InputJsonValue,
      gapAnalyzedAt: new Date(),
    },
  })

  return analysis
}
