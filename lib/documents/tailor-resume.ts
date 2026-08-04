import {
  extractJsonObject,
  generateAiText,
  getActiveAiPlatform,
} from "@/lib/ai/client"
import { loadDocumentContext } from "@/lib/documents/shared"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

type TailoredStructure = {
  summary: string
  skills: string[]
  bullets: string[]
  highlightedProjects: Array<{ title: string; detail: string }>
}

function structureToMarkdown(
  candidateName: string,
  role: string,
  structured: TailoredStructure
) {
  const skills = structured.skills.length
    ? structured.skills.join(", ")
    : "n/a"
  const bullets = structured.bullets.map((b) => `- ${b}`).join("\n")
  const projects = structured.highlightedProjects
    .map((p) => `- **${p.title}**: ${p.detail}`)
    .join("\n")

  return `# ${candidateName}
## ${role}

### Summary
${structured.summary}

### Skills
${skills}

### Experience highlights
${bullets || "- Relevant experience tailored to this role"}

### Projects
${projects || "- See portfolio for project details"}
`
}

export async function draftTailoredResume(options: {
  userId: string
  jobId: string
}) {
  const { user, job, skills, parsedResume, resumeHighlights, jobSnippet } =
    await loadDocumentContext(options.userId, options.jobId)

  const projectLines =
    user.projects.length > 0
      ? user.projects
          .map(
            (p) =>
              `${p.title}: ${(p.description ?? "").slice(0, 120)} [${p.techStack.join(", ")}]`
          )
          .join("\n")
      : parsedResume?.projects
          ?.map(
            (p) =>
              `${p.title ?? "Project"}: ${(p.description ?? "").slice(0, 120)}`
          )
          .join("\n") || "n/a"

  const fallbackStructure: TailoredStructure = {
    summary:
      parsedResume?.summary?.slice(0, 400) ||
      `${user.fullName} — ${user.primaryRole || "Software engineer"} with ${user.experienceYears ?? "relevant"} years of experience, targeting ${job.title}.`,
    skills: [
      ...(job.skillsMatched.slice(0, 8) || []),
      ...(parsedResume?.skills?.slice(0, 8) || []),
      ...skills
        .split(", ")
        .map((s) => s.replace(/\s*\([^)]*\)\s*$/, ""))
        .filter(Boolean)
        .slice(0, 8),
    ]
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, 16),
    bullets: [
      `Experienced with ${skills || parsedResume?.skills?.slice(0, 5).join(", ") || "modern web stacks"}`,
      job.skillsMatched.length
        ? `Strong overlap with this role: ${job.skillsMatched.slice(0, 5).join(", ")}`
        : `Interested in ${job.title}${job.company ? ` at ${job.company}` : ""}`,
      user.careerGoal || parsedResume?.careerGoal
        ? `Career focus: ${user.careerGoal || parsedResume?.careerGoal}`
        : "Ready to contribute in a remote-friendly product team",
    ],
    highlightedProjects: (user.projects.length
      ? user.projects
      : (parsedResume?.projects ?? []).map((p) => ({
          title: p.title ?? "Project",
          description: p.description ?? "",
          techStack: p.techStack ?? [],
        }))
    )
      .slice(0, 3)
      .map((p) => ({
        title: p.title,
        detail:
          (p.description ?? "").slice(0, 180) ||
          (p.techStack?.length ? `Built with ${p.techStack.join(", ")}` : ""),
      })),
  }

  let structured = fallbackStructure
  let content = structureToMarkdown(
    user.fullName,
    user.primaryRole || job.title,
    structured
  )
  const title = `Tailored resume — ${job.title}${job.company ? ` @ ${job.company}` : ""}`

  const platform = await getActiveAiPlatform(options.userId)
  if (platform) {
    try {
      const output = await generateAiText({
        platform,
        maxTokens: 1200,
        system:
          "Tailor a resume summary for this specific job. Return JSON only with keys: summary (string), skills (string[]), bullets (string[] of 4-6 achievement lines), highlightedProjects (array of {title, detail}), content (markdown string of the full tailored resume). Emphasize overlapping skills. No placeholders. No false experience.",
        prompt: `Candidate: ${user.fullName}
Role: ${user.primaryRole ?? "n/a"}
Experience years: ${user.experienceYears ?? "n/a"}
Skills: ${skills || parsedResume?.skills?.join(", ") || "n/a"}
Career goal: ${user.careerGoal || parsedResume?.careerGoal || "n/a"}
Resume highlights: ${resumeHighlights || "n/a"}
Projects:
${projectLines}
Education: ${[user.degree, user.university].filter(Boolean).join(", ") || "n/a"}

Target job: ${job.title}
Company: ${job.company ?? "n/a"}
Matched skills: ${job.skillsMatched.join(", ") || "n/a"}
Job snippet: ${jobSnippet || "n/a"}

JSON only.`,
      })

      const parsed = extractJsonObject(output)
      if (parsed) {
        const next: TailoredStructure = {
          summary:
            typeof parsed.summary === "string" && parsed.summary.trim()
              ? parsed.summary.slice(0, 800)
              : fallbackStructure.summary,
          skills: Array.isArray(parsed.skills)
            ? parsed.skills.map(String).slice(0, 24)
            : fallbackStructure.skills,
          bullets: Array.isArray(parsed.bullets)
            ? parsed.bullets.map(String).slice(0, 8)
            : fallbackStructure.bullets,
          highlightedProjects: Array.isArray(parsed.highlightedProjects)
            ? parsed.highlightedProjects
                .map((item) => {
                  if (!item || typeof item !== "object") return null
                  const row = item as Record<string, unknown>
                  const projectTitle = String(row.title ?? "").trim()
                  if (!projectTitle) return null
                  return {
                    title: projectTitle.slice(0, 120),
                    detail: String(row.detail ?? "").slice(0, 400),
                  }
                })
                .filter(
                  (item): item is { title: string; detail: string } =>
                    item !== null
                )
                .slice(0, 4)
            : fallbackStructure.highlightedProjects,
        }
        structured = next
        content =
          typeof parsed.content === "string" && parsed.content.trim()
            ? parsed.content.slice(0, 12000)
            : structureToMarkdown(
                user.fullName,
                user.primaryRole || job.title,
                structured
              )
      }
    } catch {
      // Keep fallback
    }
  }

  return prisma.jobDocument.upsert({
    where: {
      userId_jobId_type: {
        userId: options.userId,
        jobId: options.jobId,
        type: "tailored_resume",
      },
    },
    create: {
      userId: options.userId,
      jobId: options.jobId,
      type: "tailored_resume",
      title,
      content,
      structuredJson: structured as unknown as Prisma.InputJsonValue,
    },
    update: {
      title,
      content,
      structuredJson: structured as unknown as Prisma.InputJsonValue,
    },
  })
}
