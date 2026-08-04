import { readFile } from "node:fs/promises"
import path from "node:path"
import { extractText, getDocumentProxy } from "unpdf"
import mammoth from "mammoth"
import { generateAiText, getActiveAiPlatform } from "@/lib/ai/client"
import { prisma } from "@/lib/prisma"

export type ParsedResume = {
  summary?: string
  primaryRole?: string
  experienceYears?: number
  skills?: string[]
  techStack?: string[]
  targetRoles?: string[]
  careerGoal?: string
  education?: {
    degree?: string
    university?: string
    graduationYear?: number
  }
  certifications?: string[]
  links?: {
    github?: string
    linkedin?: string
    portfolio?: string
  }
  projects?: Array<{
    title: string
    description?: string
    techStack?: string[]
  }>
  rawTextPreview?: string
}

async function extractResumeText(
  absolutePath: string,
  mimeType: string | null,
  fileName: string
): Promise<string> {
  const lower = fileName.toLowerCase()
  const isDocx =
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  const isDoc =
    mimeType === "application/msword" || lower.endsWith(".doc")
  const isPdf =
    mimeType === "application/pdf" || lower.endsWith(".pdf")

  if (isDocx) {
    const result = await mammoth.extractRawText({ path: absolutePath })
    return result.value.trim()
  }

  if (isDoc) {
    throw new Error(
      "Legacy .doc files are not supported for parsing. Upload a PDF or .docx."
    )
  }

  if (isPdf) {
    const buffer = await readFile(absolutePath)
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    if (Array.isArray(text)) {
      return text.join("\n").trim()
    }
    return String(text ?? "").trim()
  }

  throw new Error("Unsupported resume format for parsing")
}

function parseResumeJson(output: string): ParsedResume | null {
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced?.[1]?.trim() ?? output.trim()
  const objectMatch = raw.match(/\{[\s\S]*\}/)
  if (!objectMatch) return null
  try {
    return JSON.parse(objectMatch[0]) as ParsedResume
  } catch {
    return null
  }
}

/**
 * Extract text from the stored resume, AI-structure it, save parsedJson,
 * and optionally merge fields into the user profile.
 */
export async function parseAndApplyResume(options: {
  userId: string
  resumeId?: string
  applyToProfile?: boolean
}) {
  const resume = await prisma.resume.findFirst({
    where: {
      userId: options.userId,
      ...(options.resumeId ? { id: options.resumeId } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  if (!resume) {
    throw new Error("No resume found. Upload a resume first.")
  }

  const absolutePath = path.isAbsolute(resume.fileUrl)
    ? resume.fileUrl
    : path.join(process.cwd(), resume.fileUrl)

  const text = await extractResumeText(
    absolutePath,
    resume.mimeType,
    resume.fileName
  )

  if (!text || text.length < 40) {
    throw new Error(
      "Could not extract enough text from the resume. Try a text-based PDF or DOCX."
    )
  }

  const platform = await getActiveAiPlatform(options.userId)
  let parsed: ParsedResume = {
    rawTextPreview: text.slice(0, 2000),
  }

  if (platform) {
    const output = await generateAiText({
      platform,
      maxTokens: 1200,
      system:
        "Extract structured career data from a resume. Return JSON only with keys: summary, primaryRole, experienceYears (number), skills (string[]), techStack (string[]), targetRoles (string[]), careerGoal, education {degree, university, graduationYear}, certifications (string[]), links {github, linkedin, portfolio}, projects [{title, description, techStack}]. Omit unknown fields. No markdown.",
      prompt: `Resume text:\n${text.slice(0, 12000)}`,
    })
    const aiParsed = parseResumeJson(output)
    if (aiParsed) {
      parsed = {
        ...aiParsed,
        rawTextPreview: text.slice(0, 2000),
      }
    }
  } else {
    // Heuristic fallback without AI: pull likely skill-like tokens
    const skillHints = Array.from(
      text.matchAll(
        /\b(TypeScript|JavaScript|Python|React|Next\.?js|Node\.?js|PostgreSQL|Prisma|AWS|Docker|Kubernetes|Go|Rust|Java|SQL|GraphQL|Tailwind|MongoDB|Redis|CI\/CD)\b/gi
      )
    ).map((match) => match[1])
    parsed.skills = [...new Set(skillHints.map((s) => s.trim()))].slice(0, 20)
    parsed.techStack = parsed.skills
  }

  const skillCount = parsed.skills?.length ?? 0
  const atsScore = Math.min(
    98,
    40 + skillCount * 3 + (parsed.primaryRole ? 8 : 0) + (parsed.summary ? 6 : 0)
  )

  const updatedResume = await prisma.resume.update({
    where: { id: resume.id },
    data: {
      parsedJson: parsed,
      atsScore,
    },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
      parsedJson: true,
      atsScore: true,
      createdAt: true,
    },
  })

  let profileUpdated = false

  if (options.applyToProfile !== false) {
    const userPatch: Record<string, unknown> = {}
    if (parsed.primaryRole) userPatch.primaryRole = parsed.primaryRole
    if (typeof parsed.experienceYears === "number") {
      userPatch.experienceYears = parsed.experienceYears
    }
    if (parsed.careerGoal) userPatch.careerGoal = parsed.careerGoal
    if (parsed.education?.degree) userPatch.degree = parsed.education.degree
    if (parsed.education?.university) {
      userPatch.university = parsed.education.university
    }
    if (typeof parsed.education?.graduationYear === "number") {
      userPatch.graduationYear = parsed.education.graduationYear
    }
    if (parsed.certifications?.length) {
      userPatch.certifications = parsed.certifications
    }
    if (parsed.techStack?.length) {
      userPatch.preferredTechStack = parsed.techStack.slice(0, 30)
    }
    if (parsed.links?.github) userPatch.githubUrl = parsed.links.github
    if (parsed.links?.linkedin) userPatch.linkedinUrl = parsed.links.linkedin
    if (parsed.links?.portfolio) userPatch.portfolioUrl = parsed.links.portfolio

    if (Object.keys(userPatch).length > 0) {
      await prisma.user.update({
        where: { id: options.userId },
        data: userPatch,
      })
      profileUpdated = true
    }

    if (parsed.targetRoles?.length) {
      await prisma.jobPreferences.upsert({
        where: { userId: options.userId },
        create: {
          userId: options.userId,
          targetRoles: parsed.targetRoles.slice(0, 12),
        },
        update: {
          targetRoles: parsed.targetRoles.slice(0, 12),
        },
      })
      profileUpdated = true
    }

    if (parsed.skills?.length) {
      for (const skillName of parsed.skills.slice(0, 25)) {
        const cleaned = skillName.trim()
        if (!cleaned) continue
        const skill = await prisma.skill.upsert({
          where: { name: cleaned },
          create: { name: cleaned },
          update: {},
        })
        await prisma.userSkill.upsert({
          where: {
            userId_skillId: {
              userId: options.userId,
              skillId: skill.id,
            },
          },
          create: {
            userId: options.userId,
            skillId: skill.id,
            years: "1",
            level: "intermediate",
          },
          update: {},
        })
      }
      profileUpdated = true
    }

    if (parsed.projects?.length) {
      const existingCount = await prisma.project.count({
        where: { userId: options.userId },
      })
      if (existingCount === 0) {
        for (const project of parsed.projects.slice(0, 5)) {
          if (!project.title?.trim()) continue
          await prisma.project.create({
            data: {
              userId: options.userId,
              title: project.title.trim().slice(0, 120),
              description: project.description?.slice(0, 2000) ?? null,
              techStack: (project.techStack ?? []).slice(0, 20),
            },
          })
        }
        profileUpdated = true
      }
    }
  }

  return {
    resume: updatedResume,
    parsed,
    profileUpdated,
    usedAi: Boolean(platform),
  }
}
