import { prisma } from "@/lib/prisma"

export type ParsedResumeSnippet = {
  summary?: string
  skills?: string[]
  techStack?: string[]
  careerGoal?: string
  projects?: Array<{
    title?: string
    description?: string
    techStack?: string[]
  }>
}

export const DOCUMENT_TYPES = ["cover_letter", "tailored_resume"] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export function isDocumentType(value: string): value is DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType)
}

export async function loadDocumentContext(userId: string, jobId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      email: true,
      primaryRole: true,
      careerGoal: true,
      experienceYears: true,
      githubUrl: true,
      linkedinUrl: true,
      portfolioUrl: true,
      degree: true,
      university: true,
      skills: {
        select: { skill: { select: { name: true } }, level: true, years: true },
      },
      projects: {
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: {
          title: true,
          description: true,
          techStack: true,
        },
      },
      resumes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { fileName: true, parsedJson: true, atsScore: true },
      },
    },
  })

  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
  })

  if (!user || !job) {
    throw new Error("Job or user not found")
  }

  const skills = user.skills
    .map((item) => `${item.skill.name} (${item.level})`)
    .join(", ")

  const parsedResume = user.resumes[0]?.parsedJson as
    | ParsedResumeSnippet
    | null
    | undefined

  const resumeHighlights = [
    parsedResume?.summary,
    parsedResume?.skills?.slice(0, 12).join(", "),
    parsedResume?.projects
      ?.slice(0, 2)
      .map((p) => p.title)
      .filter(Boolean)
      .join("; "),
  ]
    .filter(Boolean)
    .join(" | ")

  const jobSnippet = (job.description ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800)

  return {
    user,
    job,
    skills,
    parsedResume,
    resumeHighlights,
    jobSnippet,
  }
}
