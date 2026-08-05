import type { GapAnalysis } from "@/lib/jobs/gap-analysis"

export type CustomAnswer = {
  /** Regex source matched against field labels */
  pattern: string
  answer: string
  label: string
}

type ProfileForAnswers = {
  fullName: string
  primaryRole: string | null
  experienceYears: number | null
  careerGoal: string | null
  workPreference: string | null
  noticePeriod: string | null
  expectedSalary: number | null
  salaryPeriod: string | null
  preferredTechStack: string[]
  englishLevel: string | null
  degree: string | null
  university: string | null
  willingOverlapUsEu: boolean
  skills: string[]
}

/**
 * Build ATS custom-question answers from profile + optional gap analysis.
 */
export function buildCustomAnswers(options: {
  profile: ProfileForAnswers
  coverLetter?: string
  gap?: GapAnalysis | null
}): CustomAnswer[] {
  const p = options.profile
  const years =
    typeof p.experienceYears === "number" ? `${p.experienceYears}` : null
  const salary = p.expectedSalary
    ? `${p.expectedSalary}${p.salaryPeriod ? ` ${p.salaryPeriod}` : ""}`
    : null
  const stack = p.preferredTechStack.slice(0, 8).join(", ")
  const skills = p.skills.slice(0, 10).join(", ")
  const whyUs =
    options.coverLetter?.slice(0, 600) ||
    p.careerGoal ||
    `I'm excited to contribute as a ${p.primaryRole ?? "software engineer"} and grow with the team.`

  const answers: CustomAnswer[] = [
    {
      label: "Years of experience",
      pattern: "years?.?(of)?.?experience|how.?long.?have.?you",
      answer: years ? `${years} years` : "",
    },
    {
      label: "Work authorization / remote",
      pattern: "work.?authorization|visa|eligible.?to.?work|right.?to.?work",
      answer: "I am available for remote work worldwide and can discuss authorization as needed.",
    },
    {
      label: "Remote preference",
      pattern: "remote|hybrid|on.?site|work.?from.?home|location.?preference",
      answer: p.workPreference || "Remote preferred",
    },
    {
      label: "Timezone overlap",
      pattern: "timezone|time.?zone|overlap|us.?hours|eu.?hours|working.?hours",
      answer: p.willingOverlapUsEu
        ? "Yes — I can overlap with US/EU business hours."
        : "Happy to align on core collaboration hours.",
    },
    {
      label: "Notice period",
      pattern: "notice.?period|when.?can.?you.?start|start.?date|availability",
      answer: p.noticePeriod || "",
    },
    {
      label: "Salary",
      pattern: "salary|compensation|expected.?pay|pay.?expectation",
      answer: salary || "",
    },
    {
      label: "Tech stack",
      pattern: "tech.?stack|technologies|tools.?you.?use|languages.?you",
      answer: stack || skills,
    },
    {
      label: "Education",
      pattern: "education|degree|university|college|graduat",
      answer: [p.degree, p.university].filter(Boolean).join(" — "),
    },
    {
      label: "English level",
      pattern: "english|language.?proficiency|fluent",
      answer: p.englishLevel || "",
    },
    {
      label: "Why this role / company",
      pattern:
        "why.?do.?you.?want|why.?this.?role|why.?our.?company|why.?are.?you.?interested|tell.?us.?about.?yourself|motivation",
      answer: whyUs,
    },
    {
      label: "Relocate",
      pattern: "willing.?to.?relocate|relocation",
      answer: "Open to remote-first roles; relocation can be discussed if needed.",
    },
    {
      label: "Sponsorship",
      pattern: "sponsorship|sponsor.?visa|require.?sponsorship",
      answer: "Please discuss sponsorship needs during screening if relevant.",
    },
  ]

  if (options.gap?.emphasize?.length) {
    answers.push({
      label: "Strengths for this role",
      pattern: "greatest.?strength|what.?makes.?you|relevant.?experience|how.?do.?you.?fit",
      answer: `I bring ${options.gap.emphasize.slice(0, 4).join(", ")}. ${options.gap.matchSummary}`,
    })
  }

  if (options.gap?.rewriteBullets?.[0]) {
    answers.push({
      label: "Achievement highlight",
      pattern: "proudest|achievement|accomplishment|impact|example.?of",
      answer: options.gap.rewriteBullets[0],
    })
  }

  return answers.filter((a) => a.answer.trim().length > 0)
}
