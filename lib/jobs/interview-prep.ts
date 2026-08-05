import {
  extractJsonObject,
  generateAiText,
  getActiveAiPlatform,
} from "@/lib/ai/client"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

export type InterviewPrep = {
  likelyQuestions: Array<{ question: string; tip: string }>
  starStories: Array<{ title: string; situation: string; action: string; result: string }>
  talkingPoints: string[]
  questionsToAsk: string[]
  cheatSheet: string
}

export async function generateInterviewPrep(options: {
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
      skills: {
        select: { skill: { select: { name: true } }, level: true },
      },
      projects: {
        take: 4,
        select: { title: true, description: true, techStack: true },
      },
    },
  })

  const job = await prisma.job.findFirst({
    where: { id: options.jobId, userId: options.userId },
  })

  if (!user || !job) throw new Error("Job or user not found")

  const skills = user.skills.map((s) => s.skill.name).join(", ")
  const project = user.projects[0]

  let prep: InterviewPrep = {
    likelyQuestions: [
      {
        question: `Why do you want to work on ${job.title}${job.company ? ` at ${job.company}` : ""}?`,
        tip: "Tie company mission to your career goal and 1 concrete skill match.",
      },
      {
        question: "Walk me through a challenging technical project.",
        tip: `Use ${project?.title ?? "your strongest project"} with STAR and metrics.`,
      },
      {
        question: `How have you used ${job.skillsMatched[0] ?? "your core stack"} in production?`,
        tip: "Give architecture + tradeoff + outcome in under 90 seconds.",
      },
    ],
    starStories: user.projects.slice(0, 2).map((p) => ({
      title: p.title,
      situation: `Needed to ship ${p.title} with ${p.techStack.slice(0, 3).join(", ") || "the team stack"}.`,
      action: (p.description ?? "Designed, built, and iterated with stakeholders.").slice(0, 220),
      result: "Shipped on time and improved reliability/UX (add your real metric).",
    })),
    talkingPoints: [
      `Role fit: ${user.primaryRole ?? "engineer"} → ${job.title}`,
      `Skills overlap: ${job.skillsMatched.slice(0, 4).join(", ") || skills || "core stack"}`,
      user.careerGoal ? `Goal: ${user.careerGoal}` : "Show ownership and shipping pace",
    ],
    questionsToAsk: [
      "What does success look like in the first 90 days?",
      "How is the team structured around this role?",
      "What are the biggest technical risks right now?",
    ],
    cheatSheet: `${job.title}${job.company ? ` @ ${job.company}` : ""}
Skills to mention: ${job.skillsMatched.slice(0, 6).join(", ") || skills}
Project: ${project?.title ?? "n/a"}
Ask: 90-day success, team structure, top risks`,
  }

  const platform = await getActiveAiPlatform(options.userId)
  if (platform) {
    try {
      const output = await generateAiText({
        platform,
        maxTokens: 1100,
        system:
          "Create an interview prep pack. Return JSON only: {likelyQuestions:[{question,tip}], starStories:[{title,situation,action,result}], talkingPoints:string[], questionsToAsk:string[], cheatSheet:string}. Keep practical and concise.",
        prompt: `Candidate: ${user.fullName}, ${user.primaryRole ?? "engineer"}, ${user.experienceYears ?? "n/a"} yrs
Skills: ${skills || "n/a"}
Projects: ${user.projects.map((p) => `${p.title}: ${(p.description ?? "").slice(0, 100)}`).join(" | ") || "n/a"}

Job: ${job.title} @ ${job.company ?? "n/a"}
Matched skills: ${job.skillsMatched.join(", ") || "n/a"}
JD: ${(job.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 800)}

JSON only.`,
      })
      const parsed = extractJsonObject(output)
      if (parsed) {
        prep = {
          likelyQuestions: Array.isArray(parsed.likelyQuestions)
            ? parsed.likelyQuestions
                .map((item) => {
                  if (!item || typeof item !== "object") return null
                  const row = item as Record<string, unknown>
                  const question = String(row.question ?? "").trim()
                  if (!question) return null
                  return {
                    question: question.slice(0, 240),
                    tip: String(row.tip ?? "").slice(0, 240),
                  }
                })
                .filter(
                  (item): item is { question: string; tip: string } =>
                    item !== null
                )
                .slice(0, 8)
            : prep.likelyQuestions,
          starStories: Array.isArray(parsed.starStories)
            ? parsed.starStories
                .map((item) => {
                  if (!item || typeof item !== "object") return null
                  const row = item as Record<string, unknown>
                  const title = String(row.title ?? "").trim()
                  if (!title) return null
                  return {
                    title: title.slice(0, 120),
                    situation: String(row.situation ?? "").slice(0, 400),
                    action: String(row.action ?? "").slice(0, 400),
                    result: String(row.result ?? "").slice(0, 400),
                  }
                })
                .filter(
                  (
                    item
                  ): item is {
                    title: string
                    situation: string
                    action: string
                    result: string
                  } => item !== null
                )
                .slice(0, 4)
            : prep.starStories,
          talkingPoints: Array.isArray(parsed.talkingPoints)
            ? parsed.talkingPoints.map(String).slice(0, 8)
            : prep.talkingPoints,
          questionsToAsk: Array.isArray(parsed.questionsToAsk)
            ? parsed.questionsToAsk.map(String).slice(0, 6)
            : prep.questionsToAsk,
          cheatSheet:
            typeof parsed.cheatSheet === "string"
              ? parsed.cheatSheet.slice(0, 2000)
              : prep.cheatSheet,
        }
      }
    } catch {
      // keep fallback
    }
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      interviewPrepJson: prep as unknown as Prisma.InputJsonValue,
      interviewPrepAt: new Date(),
    },
  })

  return prep
}
