export type JobSourceCategory =
  | "remote_board"
  | "ats"
  | "company_careers"
  | "startup_board"
  | "freelance"
  | "ai_ml"
  | "general"

export type NormalizedJob = {
  externalId: string
  source: string
  sourceCategory?: JobSourceCategory
  title: string
  company: string | null
  companyId?: string | null
  location: string | null
  isRemote: boolean
  url: string
  description: string | null
  salary: string | null
  tags: string[]
  postedAt: Date | null
  fingerprint?: string
}

export type ProfileSearchContext = {
  skills: string[]
  roles: string[]
  keywords: string[]
  excludeKeywords: string[]
  techStack: string[]
  remoteOnly: boolean
  experienceYears: number | null
  careerGoal: string | null
}
