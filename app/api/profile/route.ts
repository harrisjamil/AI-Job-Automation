import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function toOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

function toOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed || null
}

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      username: true,
      country: true,
      city: true,
      timezone: true,
      experienceYears: true,
      primaryRole: true,
      preferredJobType: true,
      workPreference: true,
      englishLevel: true,
      githubUrl: true,
      linkedinUrl: true,
      portfolioUrl: true,
      expectedSalary: true,
      salaryPeriod: true,
      noticePeriod: true,
      availableHoursPerWeek: true,
      preferredTechStack: true,
      preferredCompanySize: true,
      preferredIndustries: true,
      willingOverlapUsEu: true,
      degree: true,
      university: true,
      graduationYear: true,
      certifications: true,
      careerGoal: true,
      skills: {
        select: {
          id: true,
          years: true,
          level: true,
          skill: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      projects: {
        orderBy: { createdAt: "asc" },
      },
      resumes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          atsScore: true,
          createdAt: true,
        },
      },
      jobPreferences: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { resumes, skills, jobPreferences, ...profile } = user

  return NextResponse.json({
    profile: {
      ...profile,
      skills: skills.map((item) => ({
        id: item.id,
        name: item.skill.name,
        years: item.years,
        level: item.level,
      })),
      projects: user.projects,
      resume: resumes[0] ?? null,
      jobPreferences: jobPreferences ?? {
        targetRoles: [],
        targetCountries: [],
        includeKeywords: [],
        excludeKeywords: [],
        remoteOnly: true,
      },
    },
  })
}

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const fullName = toOptionalString(body.fullName)
    const email = toOptionalString(body.email)?.toLowerCase()
    const country = toOptionalString(body.country)
    const timezone = toOptionalString(body.timezone)
    const experienceYears = toOptionalInt(body.experienceYears)
    const primaryRole = toOptionalString(body.primaryRole)
    const preferredJobType = toOptionalString(body.preferredJobType)
    const workPreference = toOptionalString(body.workPreference)
    const englishLevel = toOptionalString(body.englishLevel)

    if (
      !fullName ||
      !email ||
      !country ||
      !timezone ||
      experienceYears === null ||
      !primaryRole ||
      !preferredJobType ||
      !workPreference ||
      !englishLevel
    ) {
      return NextResponse.json(
        {
          error:
            "Full name, email, country, timezone, experience, primary role, job type, work preference, and English level are required.",
        },
        { status: 400 },
      )
    }

    const skillsInput = Array.isArray(body.skills) ? body.skills : []
    const skillMap = new Map<
      string,
      { name: string; years: string; level: string }
    >()

    for (const skill of skillsInput) {
      const name = String(skill.name ?? "")
        .trim()
        .replace(/\s+/g, " ")
      const years = String(skill.years ?? "").trim()
      const level = String(skill.level ?? "").trim()

      if (!name || !years || !level) continue
      skillMap.set(name.toLowerCase(), { name, years, level })
    }

    const normalizedSkills = [...skillMap.values()]

    if (normalizedSkills.length === 0) {
      return NextResponse.json(
        { error: "Add at least one skill with experience and level." },
        { status: 400 },
      )
    }

    const resumeCount = await prisma.resume.count({
      where: { userId: currentUser.id },
    })

    if (resumeCount === 0) {
      return NextResponse.json(
        { error: "Upload a resume before saving your profile." },
        { status: 400 },
      )
    }

    const emailOwner = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (emailOwner && emailOwner.id !== currentUser.id) {
      return NextResponse.json(
        { error: "That email is already in use." },
        { status: 409 },
      )
    }

    type NormalizedProject = {
      title: string
      description: string | null
      techStack: string[]
      githubUrl: string | null
      liveUrl: string | null
    }

    const projectsInput = Array.isArray(body.projects) ? body.projects : []
    const normalizedProjects: NormalizedProject[] = []

    for (const project of projectsInput) {
      const title = String(project?.title ?? "").trim()
      if (!title) continue

      normalizedProjects.push({
        title,
        description: toOptionalString(project?.description),
        techStack: splitList(project?.techStack),
        githubUrl: toOptionalString(project?.githubUrl),
        liveUrl: toOptionalString(project?.liveUrl),
      })
    }

    const jobPreferences = body.jobPreferences ?? {}

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          fullName,
          email,
          country,
          city: toOptionalString(body.city),
          timezone,
          experienceYears,
          primaryRole,
          preferredJobType,
          workPreference,
          englishLevel,
          githubUrl: toOptionalString(body.githubUrl),
          linkedinUrl: toOptionalString(body.linkedinUrl),
          portfolioUrl: toOptionalString(body.portfolioUrl),
          expectedSalary: toOptionalInt(body.expectedSalary),
          salaryPeriod: toOptionalString(body.salaryPeriod),
          noticePeriod: toOptionalString(body.noticePeriod),
          availableHoursPerWeek: toOptionalInt(body.availableHoursPerWeek),
          preferredTechStack: splitList(body.preferredTechStack),
          preferredCompanySize: toOptionalString(body.preferredCompanySize),
          preferredIndustries: splitList(body.preferredIndustries),
          willingOverlapUsEu: Boolean(body.willingOverlapUsEu),
          degree: toOptionalString(body.degree),
          university: toOptionalString(body.university),
          graduationYear: toOptionalInt(body.graduationYear),
          certifications: splitList(body.certifications),
          careerGoal: toOptionalString(body.careerGoal),
        },
      })

      await tx.userSkill.deleteMany({ where: { userId: currentUser.id } })

      for (const skill of normalizedSkills) {
        const skillRecord = await tx.skill.upsert({
          where: { name: skill.name },
          create: { name: skill.name },
          update: {},
        })

        await tx.userSkill.create({
          data: {
            userId: currentUser.id,
            skillId: skillRecord.id,
            years: skill.years,
            level: skill.level,
          },
        })
      }

      await tx.project.deleteMany({ where: { userId: currentUser.id } })

      if (normalizedProjects.length > 0) {
        await tx.project.createMany({
          data: normalizedProjects.map((project) => ({
            userId: currentUser.id,
            ...project,
          })),
        })
      }

      await tx.jobPreferences.upsert({
        where: { userId: currentUser.id },
        create: {
          userId: currentUser.id,
          targetRoles: splitList(jobPreferences.targetRoles),
          targetCountries: splitList(jobPreferences.targetCountries),
          includeKeywords: splitList(jobPreferences.includeKeywords),
          excludeKeywords: splitList(jobPreferences.excludeKeywords),
          remoteOnly:
            typeof jobPreferences.remoteOnly === "boolean"
              ? jobPreferences.remoteOnly
              : true,
        },
        update: {
          targetRoles: splitList(jobPreferences.targetRoles),
          targetCountries: splitList(jobPreferences.targetCountries),
          includeKeywords: splitList(jobPreferences.includeKeywords),
          excludeKeywords: splitList(jobPreferences.excludeKeywords),
          remoteOnly:
            typeof jobPreferences.remoteOnly === "boolean"
              ? jobPreferences.remoteOnly
              : true,
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json(
      { error: "Unable to save profile. Please try again." },
      { status: 500 },
    )
  }
}
