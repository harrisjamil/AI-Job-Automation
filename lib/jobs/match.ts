import {
  extractJsonArray,
  generateAiText,
  getActiveAiPlatform,
  type AiPlatformConfig,
} from "@/lib/ai/client"
import { selectMatchSkills } from "@/lib/jobs/relevance"
import type { NormalizedJob, ProfileSearchContext } from "@/lib/jobs/types"

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const cleaned = value.trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
  }
  return result
}

/**
 * Build search keywords from roles + include keywords + tech stack +
 * high-signal skills only (not soft skills / Git / HTML / etc.).
 */
export function buildSearchKeywords(profile: ProfileSearchContext): string[] {
  const matchSkills = selectMatchSkills(profile.skills, 28)

  // Roles and explicit keywords first — they define intent
  return uniqueStrings([
    ...profile.roles,
    ...profile.keywords,
    ...profile.techStack,
    ...matchSkills,
  ]).slice(0, 20)
}

export async function expandSearchKeywords(
  profile: ProfileSearchContext,
  platform: AiPlatformConfig | null
): Promise<string[]> {
  const base = buildSearchKeywords(profile)
  if (!platform || base.length === 0) return base

  const matchSkills = selectMatchSkills(profile.skills, 20)

  try {
    const output = await generateAiText({
      platform,
      maxTokens: 400,
      system:
        "You expand job-search keywords for a tech candidate. Reply with JSON array of strings only. Prefer job titles and concrete tech (React, NestJS, Laravel). Never include soft skills, Git, HTML, CSS, Agile, or communication.",
      prompt: `Primary roles: ${profile.roles.join(", ") || "n/a"}
Include keywords: ${profile.keywords.join(", ") || "n/a"}
Tech stack: ${profile.techStack.join(", ") || "n/a"}
Core skills: ${matchSkills.join(", ") || "n/a"}
Career goal: ${profile.careerGoal || "n/a"}
Experience years: ${profile.experienceYears ?? "n/a"}

Return 8-12 short search keywords focused on job titles and stack synonyms. JSON array only.`,
    })

    const parsed = extractJsonArray(output)
      .map((item) => String(item))
      .filter(Boolean)

    return uniqueStrings([...base, ...parsed]).slice(0, 24)
  } catch {
    return base
  }
}

function wordBoundaryIncludes(haystack: string, needle: string): boolean {
  if (needle.length <= 2) return false
  if (haystack.includes(needle)) {
    // Avoid "go" matching "google" — require longer needles or token match
    if (needle.length <= 3) {
      const re = new RegExp(
        `(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
        "i"
      )
      return re.test(haystack)
    }
    return true
  }
  return false
}

function scoreJobHeuristic(
  job: NormalizedJob,
  profile: ProfileSearchContext,
  keywords: string[]
): { score: number; matched: string[] } {
  const title = job.title.toLowerCase()
  const haystack = [
    job.title,
    job.company,
    job.location,
    job.description,
    ...job.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const matchSkills = selectMatchSkills(profile.skills, 40)
  const matched: string[] = []
  let score = 0
  let titleHits = 0
  let skillHits = 0
  let roleHits = 0

  // Role fit in title is the strongest signal
  for (const role of profile.roles) {
    const key = role.toLowerCase().trim()
    if (key.length < 3) continue
    const tokens = key.split(/[^a-z0-9+#.]/i).filter((t) => t.length >= 4)
    const hit =
      wordBoundaryIncludes(title, key) ||
      tokens.some((token) => wordBoundaryIncludes(title, token))
    if (hit) {
      matched.push(role)
      score += 22
      roleHits += 1
      titleHits += 1
    }
  }

  for (const keyword of keywords) {
    const key = keyword.toLowerCase()
    if (key.length < 3) continue
    if (wordBoundaryIncludes(title, key)) {
      if (!matched.some((m) => m.toLowerCase() === key)) matched.push(keyword)
      score += 14
      titleHits += 1
    } else if (wordBoundaryIncludes(haystack, key)) {
      if (!matched.some((m) => m.toLowerCase() === key)) matched.push(keyword)
      score += 5
    }
  }

  for (const skill of matchSkills) {
    const key = skill.toLowerCase()
    if (key.length < 2) continue
    if (!wordBoundaryIncludes(haystack, key)) continue
    if (matched.some((m) => m.toLowerCase() === key)) continue
    matched.push(skill)
    skillHits += 1
    score += wordBoundaryIncludes(title, key) ? 12 : 7
  }

  // Small remote bonus — never enough alone to pass the save threshold
  if (job.isRemote) score += 3
  if (profile.remoteOnly && !job.isRemote) score -= 40

  for (const exclude of profile.excludeKeywords) {
    if (wordBoundaryIncludes(haystack, exclude.toLowerCase())) {
      score -= 40
    }
  }

  // Hard gate: must have real signal (role, title keyword, or multiple skills)
  const hasRealFit = roleHits > 0 || titleHits > 0 || skillHits >= 2
  if (!hasRealFit) {
    return { score: 0, matched: [] }
  }

  // Prefer jobs with role/title alignment
  if (roleHits === 0 && titleHits === 0 && skillHits < 3) {
    score = Math.min(score, 18)
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    matched: uniqueStrings(matched).slice(0, 12),
  }
}

/** Minimum score to save a job — remote-only noise must not pass. */
export const MIN_MATCH_SCORE = 28

export async function scoreAndRankJobs(
  jobs: NormalizedJob[],
  profile: ProfileSearchContext,
  keywords: string[],
  userId: string
): Promise<
  Array<NormalizedJob & { matchScore: number; skillsMatched: string[] }>
> {
  const heuristic = jobs.map((job) => {
    const { score, matched } = scoreJobHeuristic(job, profile, keywords)
    return { ...job, matchScore: score, skillsMatched: matched }
  })

  heuristic.sort((a, b) => b.matchScore - a.matchScore)

  const top = heuristic.filter((j) => j.matchScore >= MIN_MATCH_SCORE).slice(0, 40)
  const platform = await getActiveAiPlatform(userId)
  if (!platform || top.length === 0) {
    return heuristic
  }

  try {
    const compact = top.map((job, index) => ({
      i: index,
      title: job.title,
      company: job.company,
      tags: job.tags.slice(0, 8),
      remote: job.isRemote,
      location: job.location,
      snippet: (job.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 220),
    }))

    const matchSkills = selectMatchSkills(profile.skills, 24)

    const output = await generateAiText({
      platform,
      maxTokens: 800,
      system:
        "You score job fit strictly. Reply JSON array of {i:number, score:0-100, matched:string[]} only. Score under 40 if the title is unrelated to the candidate roles even if some tools overlap.",
      prompt: `Candidate roles (must align with job title when possible): ${profile.roles.join(", ") || "n/a"}
Core skills: ${matchSkills.join(", ")}
Search keywords: ${keywords.join(", ")}
Exclude: ${profile.excludeKeywords.join(", ") || "none"}

Jobs:
${JSON.stringify(compact)}

Score 0-100 for true role + stack fit. Penalize mismatched titles (e.g. Java backend when candidate wants Next.js). JSON array only.`,
    })

    const parsed = extractJsonArray(output) as Array<{
      i?: number
      score?: number
      matched?: string[]
    }>

    for (const item of parsed) {
      if (typeof item.i !== "number" || !top[item.i]) continue
      const aiScore = Math.max(0, Math.min(100, Number(item.score) || 0))
      top[item.i].matchScore = Math.round(
        top[item.i].matchScore * 0.4 + aiScore * 0.6
      )
      if (Array.isArray(item.matched)) {
        top[item.i].skillsMatched = uniqueStrings([
          ...top[item.i].skillsMatched,
          ...item.matched.map(String),
        ]).slice(0, 12)
      }
    }

    const topIds = new Set(top.map((j) => `${j.source}:${j.externalId}`))
    const rest = heuristic.filter(
      (j) => !topIds.has(`${j.source}:${j.externalId}`)
    )
    return [...top, ...rest].sort((a, b) => b.matchScore - a.matchScore)
  } catch {
    return heuristic
  }
}
