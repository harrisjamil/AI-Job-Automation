import {
  extractJsonObject,
  generateAiText,
  getActiveAiPlatform,
} from "@/lib/ai/client"
import { loadDocumentContext } from "@/lib/documents/shared"
import { prisma } from "@/lib/prisma"

export async function draftCoverLetter(options: {
  userId: string
  jobId: string
}) {
  const { user, job, skills, parsedResume, resumeHighlights, jobSnippet } =
    await loadDocumentContext(options.userId, options.jobId)

  const defaultTitle = `Cover letter — ${job.title}${job.company ? ` @ ${job.company}` : ""}`
  let title = defaultTitle
  let content = `Dear Hiring Team,

I am writing to express my interest in the ${job.title} position${job.company ? ` at ${job.company}` : ""}.

With ${user.experienceYears ?? "several"} years of experience and strengths in ${skills || parsedResume?.skills?.join(", ") || "relevant technologies"}, I am excited about the opportunity to contribute.

${parsedResume?.summary ? `${parsedResume.summary.slice(0, 320)}\n\n` : ""}${user.careerGoal || parsedResume?.careerGoal ? `My goal: ${user.careerGoal || parsedResume?.careerGoal}\n\n` : ""}I would welcome the chance to discuss how my background aligns with your needs.

Sincerely,
${user.fullName}
${user.email}
${user.linkedinUrl ? `LinkedIn: ${user.linkedinUrl}` : ""}
${user.githubUrl ? `GitHub: ${user.githubUrl}` : ""}`

  const platform = await getActiveAiPlatform(options.userId)
  if (platform) {
    try {
      const output = await generateAiText({
        platform,
        maxTokens: 900,
        system:
          "Write a professional cover letter tailored to this specific job using the candidate profile and resume. Return JSON {title, body} only. No placeholders. Keep under 320 words. Sound human and specific. Mirror 3-5 skills from the job description.",
        prompt: `Candidate: ${user.fullName}
Email: ${user.email}
Role: ${user.primaryRole ?? "n/a"}
Experience years: ${user.experienceYears ?? "n/a"}
Skills: ${skills || parsedResume?.skills?.join(", ") || "n/a"}
Career goal: ${user.careerGoal || parsedResume?.careerGoal || "n/a"}
Resume highlights: ${resumeHighlights || "n/a"}
Education: ${[user.degree, user.university].filter(Boolean).join(", ") || "n/a"}
Links: ${[user.linkedinUrl, user.githubUrl, user.portfolioUrl].filter(Boolean).join(" | ") || "n/a"}

Job title: ${job.title}
Company: ${job.company ?? "n/a"}
Location: ${job.location ?? "n/a"}
Remote: ${job.isRemote}
Matched skills: ${job.skillsMatched.join(", ") || "n/a"}
Job snippet: ${jobSnippet || "n/a"}

JSON only: {"title":"...","body":"..."}`,
      })

      const parsed = extractJsonObject(output)
      if (parsed) {
        if (typeof parsed.title === "string" && parsed.title.trim()) {
          title = parsed.title.slice(0, 200)
        }
        if (typeof parsed.body === "string" && parsed.body.trim()) {
          content = parsed.body.slice(0, 8000)
        }
      }
    } catch {
      // Keep template
    }
  }

  return prisma.jobDocument.upsert({
    where: {
      userId_jobId_type: {
        userId: options.userId,
        jobId: options.jobId,
        type: "cover_letter",
      },
    },
    create: {
      userId: options.userId,
      jobId: options.jobId,
      type: "cover_letter",
      title,
      content,
    },
    update: {
      title,
      content,
    },
  })
}
