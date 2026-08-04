import { generateAiText, getActiveAiPlatform } from "@/lib/ai/client"
import { prisma } from "@/lib/prisma"

export async function draftOutreachEmail(options: {
  userId: string
  jobId: string
  contactId?: string | null
  toEmail: string
}) {
  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: {
      fullName: true,
      email: true,
      primaryRole: true,
      careerGoal: true,
      experienceYears: true,
      githubUrl: true,
      linkedinUrl: true,
      portfolioUrl: true,
      skills: { select: { skill: { select: { name: true } }, level: true } },
      resumes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { fileName: true },
      },
    },
  })

  const job = await prisma.job.findFirst({
    where: { id: options.jobId, userId: options.userId },
  })

  if (!user || !job) {
    throw new Error("Job or user not found")
  }

  const contact = options.contactId
    ? await prisma.jobContact.findFirst({
        where: { id: options.contactId, jobId: job.id },
      })
    : null

  const skills = user.skills
    .map((item) => `${item.skill.name} (${item.level})`)
    .join(", ")

  const platform = await getActiveAiPlatform(options.userId)
  let subject = `Application interest — ${job.title}`
  let body = `Hi${contact?.name ? ` ${contact.name}` : ""},

I am ${user.fullName}, and I am interested in the ${job.title} role${job.company ? ` at ${job.company}` : ""}.

My background includes: ${skills || "relevant technical skills"}.
${user.careerGoal ? `Goal: ${user.careerGoal}` : ""}

I would welcome a chance to discuss how I can help your team.

Best regards,
${user.fullName}
${user.email}
${user.linkedinUrl ? `LinkedIn: ${user.linkedinUrl}` : ""}
${user.githubUrl ? `GitHub: ${user.githubUrl}` : ""}
${user.portfolioUrl ? `Portfolio: ${user.portfolioUrl}` : ""}`

  if (platform) {
    try {
      const output = await generateAiText({
        platform,
        maxTokens: 700,
        system:
          "Write a concise professional job outreach email. Return JSON {subject, body} only. No placeholders. Keep under 180 words. Sound human, not salesy.",
        prompt: `Candidate: ${user.fullName}
Email: ${user.email}
Experience years: ${user.experienceYears ?? "n/a"}
Skills: ${skills || "n/a"}
Career goal: ${user.careerGoal || "n/a"}
Links: ${[user.linkedinUrl, user.githubUrl, user.portfolioUrl].filter(Boolean).join(" | ") || "n/a"}
Resume on file: ${user.resumes[0]?.fileName ?? "yes"}

Job title: ${job.title}
Company: ${job.company ?? "n/a"}
Location: ${job.location ?? "n/a"}
Remote: ${job.isRemote}
Matched skills: ${job.skillsMatched.join(", ") || "n/a"}
Job snippet: ${(job.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 600)}

Contact name: ${contact?.name ?? "Hiring team"}
To email: ${options.toEmail}

JSON only: {"subject":"...","body":"..."}`,
      })

      const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/i)
      const raw = fenced?.[1]?.trim() ?? output.trim()
      const objectMatch = raw.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        const parsed = JSON.parse(objectMatch[0]) as {
          subject?: string
          body?: string
        }
        if (parsed.subject) subject = String(parsed.subject).slice(0, 200)
        if (parsed.body) body = String(parsed.body).slice(0, 5000)
      }
    } catch {
      // Keep template draft
    }
  }

  return prisma.outreachEmail.create({
    data: {
      userId: options.userId,
      jobId: options.jobId,
      contactId: contact?.id ?? null,
      toEmail: options.toEmail,
      subject,
      body,
      status: "draft",
    },
  })
}
