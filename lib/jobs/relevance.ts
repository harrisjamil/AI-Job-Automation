/**
 * Skills that match almost every job listing and destroy ranking quality.
 * Kept on the profile for display, but excluded from search/scoring.
 */
const NOISE_SKILLS = new Set(
  [
    // Soft skills
    "problem solving",
    "communication",
    "team collaboration",
    "leadership",
    "time management",
    "critical thinking",
    "mentoring",
    "project management",
    "code review",
    "technical writing",
    "technical documentation",
    // Ubiquitous / low-signal tools
    "git",
    "github",
    "gitlab",
    "bitbucket",
    "npm",
    "yarn",
    "pnpm",
    "bash",
    "ssh",
    "linux",
    "html5",
    "css3",
    "http/https",
    "tcp/ip",
    "dns",
    "ssl/tls",
    "vpn",
    "firewall",
    "agile",
    "scrum",
    "kanban",
    "mvc",
    "mvvm",
    "oop",
    "object-oriented programming (oop)",
    "functional programming",
    "solid principles",
    "design patterns",
    "data structures",
    "algorithms",
    "responsive design",
    "ui design",
    "ux design",
    "wireframing",
    "prototyping",
    "webpack",
    "babel",
    "rollup",
    "parcel",
    "esbuild",
    "vite",
    // Too broad alone
    "javascript (es6+)",
    "javascript",
    "rest api",
    "json api",
    "ci/cd",
  ].map((s) => s.toLowerCase())
)

/** Prefer these when present — high demand stack for matching. */
const CORE_SKILL_BOOST = new Set(
  [
    "typescript",
    "react",
    "next.js",
    "node.js",
    "express.js",
    "nestjs",
    "php",
    "laravel",
    "python",
    "fastapi",
    "django",
    "react native",
    "flutter",
    "swift",
    "kotlin",
    "mysql",
    "postgresql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "vercel",
    "firebase",
    "supabase",
    "graphql",
    "websockets",
    "openai api",
    "ollama",
    "langchain",
    "rag",
    "ai agents",
    "mcp (model context protocol)",
    "system design",
    "tailwind css",
    "prisma",
    "golang",
    "go (golang)",
    "rust",
  ].map((s) => s.toLowerCase())
)

export function isNoiseSkill(name: string): boolean {
  return NOISE_SKILLS.has(name.trim().toLowerCase())
}

export function isCoreSkill(name: string): boolean {
  return CORE_SKILL_BOOST.has(name.trim().toLowerCase())
}

/** High-signal skills only — for API queries and scoring. */
export function selectMatchSkills(skills: string[], limit = 40): string[] {
  const cleaned = skills
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !isNoiseSkill(s))

  const core = cleaned.filter((s) => isCoreSkill(s))
  const rest = cleaned.filter((s) => !isCoreSkill(s))

  // Prefer shorter, more specific skill names (avoid "Vector Databases" flooding)
  const ranked = [...core, ...rest].sort((a, b) => {
    const aCore = isCoreSkill(a) ? 0 : 1
    const bCore = isCoreSkill(b) ? 0 : 1
    if (aCore !== bCore) return aCore - bCore
    return a.length - b.length
  })

  const seen = new Set<string>()
  const result: string[] = []
  for (const skill of ranked) {
    const key = skill.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(skill)
    if (result.length >= limit) break
  }
  return result
}

/** Max age for a listing to be considered fresh. */
export const MAX_JOB_AGE_DAYS = 45

export function isFreshJob(
  job: { postedAt: Date | null; scrapedAt?: Date | null },
  now = new Date(),
  maxAgeDays = MAX_JOB_AGE_DAYS
): boolean {
  const cutoff = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000

  if (job.postedAt) {
    const posted = job.postedAt.getTime()
    if (Number.isNaN(posted)) return false
    return posted >= cutoff
  }

  // No post date: only keep if we scraped it very recently (this crawl window)
  if (job.scrapedAt) {
    const scraped = job.scrapedAt.getTime()
    if (Number.isNaN(scraped)) return false
    // Allow undated jobs only if scraped in the last 3 days
    return scraped >= now.getTime() - 3 * 24 * 60 * 60 * 1000
  }

  // Brand-new normalized jobs from this crawl without dates — allow, then stamp scrapedAt on save
  return true
}
