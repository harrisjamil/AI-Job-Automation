import {
  generateAiText,
  getActiveAiPlatform,
} from "@/lib/ai/client"
import { prisma } from "@/lib/prisma"

export async function buildAssistantContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      primaryRole: true,
      careerGoal: true,
      experienceYears: true,
      skills: {
        take: 20,
        select: { skill: { select: { name: true } }, level: true },
      },
    },
  })

  const [topJobs, openApps, drafts] = await Promise.all([
    prisma.job.findMany({
      where: { userId },
      orderBy: { matchScore: "desc" },
      take: 5,
      select: {
        title: true,
        company: true,
        matchScore: true,
        isRemote: true,
        source: true,
      },
    }),
    prisma.jobApplication.count({
      where: {
        userId,
        status: { in: ["saved", "outreach", "applied", "interview"] },
      },
    }),
    prisma.outreachEmail.count({
      where: { userId, status: "draft" },
    }),
  ])

  const skills =
    user?.skills.map((s) => `${s.skill.name} (${s.level})`).join(", ") || "n/a"

  const jobsBlock =
    topJobs.length === 0
      ? "No jobs discovered yet."
      : topJobs
          .map(
            (job, i) =>
              `${i + 1}. [${job.matchScore}] ${job.title}${job.company ? ` @ ${job.company}` : ""}${job.isRemote ? " (remote)" : ""} · ${job.source}`
          )
          .join("\n")

  return `Candidate: ${user?.fullName ?? "User"}
Role: ${user?.primaryRole ?? "n/a"}
Experience years: ${user?.experienceYears ?? "n/a"}
Career goal: ${user?.careerGoal ?? "n/a"}
Skills: ${skills}
Open applications: ${openApps}
Outreach drafts: ${drafts}
Top matched jobs:
${jobsBlock}`
}

export async function generateAssistantReply(options: {
  userId: string
  history: Array<{ role: string; content: string }>
  message: string
}) {
  const platform = await getActiveAiPlatform(options.userId)
  if (!platform) {
    return "Connect an AI platform under AI Platforms (Gemini or Hugging Face) so I can help with job search strategy, cover letters, and outreach."
  }

  const context = await buildAssistantContext(options.userId)
  const recent = options.history.slice(-12)
  const transcript = recent
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n\n")

  try {
    const output = await generateAiText({
      platform,
      maxTokens: 900,
      system:
        "You are the AI Job Automation assistant. Help the candidate with job search strategy, matching roles, outreach emails, cover letters, resume tailoring, and application follow-ups. Be concise, practical, and specific to their profile and jobs. Do not invent applications or employers they do not have. Use plain text (no markdown fences unless listing steps).",
      prompt: `Context about this user:
${context}

Conversation so far:
${transcript || "(new conversation)"}

User: ${options.message}

Assistant:`,
    })
    return output.trim().slice(0, 8000) || "I could not generate a reply. Try again."
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI request failed"
    return `Sorry — I could not reach your AI provider (${message}). Check AI Platforms and try again.`
  }
}

export function titleFromMessage(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim()
  if (!cleaned) return "New chat"
  return cleaned.slice(0, 60) + (cleaned.length > 60 ? "…" : "")
}
