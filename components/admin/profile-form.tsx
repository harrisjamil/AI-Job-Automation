"use client"

import { useEffect, useId, useState } from "react"
import { PlusIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  COMMON_SKILLS,
  COMPANY_SIZES,
  ENGLISH_LEVELS,
  EXPERIENCE_YEAR_OPTIONS,
  INDUSTRIES,
  JOB_TYPES,
  NOTICE_PERIODS,
  PRIMARY_ROLES,
  SALARY_PERIODS,
  SKILL_EXPERIENCE_OPTIONS,
  SKILL_LEVEL_OPTIONS,
  TARGET_COUNTRIES,
  TARGET_ROLES,
  TIMEZONES,
  WORK_PREFERENCES,
} from "@/lib/profile-constants"
import { cn } from "@/lib/utils"

type SkillRow = {
  key: string
  name: string
  years: string
  level: string
}

type ProjectRow = {
  key: string
  title: string
  description: string
  techStack: string
  githubUrl: string
  liveUrl: string
}

type ResumeInfo = {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string | null
  atsScore: number | null
  createdAt: string
} | null

type ProfileFormState = {
  fullName: string
  email: string
  country: string
  city: string
  timezone: string
  experienceYears: string
  primaryRole: string
  preferredJobType: string
  workPreference: string
  englishLevel: string
  githubUrl: string
  linkedinUrl: string
  portfolioUrl: string
  expectedSalary: string
  salaryPeriod: string
  noticePeriod: string
  availableHoursPerWeek: string
  preferredTechStack: string
  preferredCompanySize: string
  preferredIndustries: string[]
  willingOverlapUsEu: boolean
  degree: string
  university: string
  graduationYear: string
  certifications: string
  careerGoal: string
  skills: SkillRow[]
  projects: ProjectRow[]
  targetRoles: string[]
  targetCountries: string[]
  includeKeywords: string
  excludeKeywords: string
  remoteOnly: boolean
  resume: ResumeInfo
}

function createKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptySkill(): SkillRow {
  return { key: createKey(), name: "", years: "", level: "" }
}

function emptyProject(): ProjectRow {
  return {
    key: createKey(),
    title: "",
    description: "",
    techStack: "",
    githubUrl: "",
    liveUrl: "",
  }
}

function createInitialState(): ProfileFormState {
  return {
    fullName: "",
    email: "",
    country: "",
    city: "",
    timezone: "",
    experienceYears: "",
    primaryRole: "",
    preferredJobType: "",
    workPreference: "",
    englishLevel: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    expectedSalary: "",
    salaryPeriod: "year",
    noticePeriod: "",
    availableHoursPerWeek: "",
    preferredTechStack: "",
    preferredCompanySize: "",
    preferredIndustries: [],
    willingOverlapUsEu: false,
    degree: "",
    university: "",
    graduationYear: "",
    certifications: "",
    careerGoal: "",
    skills: [emptySkill()],
    projects: [],
    targetRoles: [],
    targetCountries: [],
    includeKeywords: "",
    excludeKeywords: "",
    remoteOnly: true,
    resume: null,
  }
}

function ProfileSelect({
  value,
  onValueChange,
  placeholder,
  options,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: readonly string[] | ReadonlyArray<{ value: string; label: string }>
  className?: string
}) {
  const items = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : option,
  )

  return (
    <Select
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? "")}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ChipToggle({
  options,
  values,
  onChange,
}: {
  options: readonly string[]
  values: string[]
  onChange: (values: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = values.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => {
              onChange(
                selected
                  ? values.filter((item) => item !== option)
                  : [...values, option],
              )
            }}
            className={cn(
              "rounded-md border px-2.5 py-1 text-sm transition-colors",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

function SectionCard({
  title,
  description,
  children,
  required,
}: {
  title: string
  description: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <section className="rounded-xl border bg-card p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            required
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground",
          )}
        >
          {required ? "Required" : "Optional"}
        </span>
      </div>
      {children}
    </section>
  )
}

export function ProfileForm() {
  const formId = useId()
  const [form, setForm] = useState<ProfileFormState>(createInitialState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile")
        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error ?? "Failed to load profile.")
          return
        }

        const profile = data.profile
        setForm({
          fullName: profile.fullName ?? "",
          email: profile.email ?? "",
          country: profile.country ?? "",
          city: profile.city ?? "",
          timezone: profile.timezone ?? "",
          experienceYears:
            profile.experienceYears === null ||
            profile.experienceYears === undefined
              ? ""
              : String(profile.experienceYears),
          primaryRole: profile.primaryRole ?? "",
          preferredJobType: profile.preferredJobType ?? "",
          workPreference: profile.workPreference ?? "",
          englishLevel: profile.englishLevel ?? "",
          githubUrl: profile.githubUrl ?? "",
          linkedinUrl: profile.linkedinUrl ?? "",
          portfolioUrl: profile.portfolioUrl ?? "",
          expectedSalary:
            profile.expectedSalary === null ||
            profile.expectedSalary === undefined
              ? ""
              : String(profile.expectedSalary),
          salaryPeriod: profile.salaryPeriod ?? "year",
          noticePeriod: profile.noticePeriod ?? "",
          availableHoursPerWeek:
            profile.availableHoursPerWeek === null ||
            profile.availableHoursPerWeek === undefined
              ? ""
              : String(profile.availableHoursPerWeek),
          preferredTechStack: (profile.preferredTechStack ?? []).join(", "),
          preferredCompanySize: profile.preferredCompanySize ?? "",
          preferredIndustries: profile.preferredIndustries ?? [],
          willingOverlapUsEu: Boolean(profile.willingOverlapUsEu),
          degree: profile.degree ?? "",
          university: profile.university ?? "",
          graduationYear:
            profile.graduationYear === null ||
            profile.graduationYear === undefined
              ? ""
              : String(profile.graduationYear),
          certifications: (profile.certifications ?? []).join(", "),
          careerGoal: profile.careerGoal ?? "",
          skills:
            profile.skills?.length > 0
              ? profile.skills.map(
                  (skill: {
                    name: string
                    years: string
                    level: string
                  }) => ({
                    key: createKey(),
                    name: skill.name,
                    years: skill.years,
                    level: skill.level,
                  }),
                )
              : [emptySkill()],
          projects:
            profile.projects?.map(
              (project: {
                title: string
                description: string | null
                techStack: string[]
                githubUrl: string | null
                liveUrl: string | null
              }) => ({
                key: createKey(),
                title: project.title,
                description: project.description ?? "",
                techStack: (project.techStack ?? []).join(", "),
                githubUrl: project.githubUrl ?? "",
                liveUrl: project.liveUrl ?? "",
              }),
            ) ?? [],
          targetRoles: profile.jobPreferences?.targetRoles ?? [],
          targetCountries: profile.jobPreferences?.targetCountries ?? [],
          includeKeywords: (
            profile.jobPreferences?.includeKeywords ?? []
          ).join(", "),
          excludeKeywords: (
            profile.jobPreferences?.excludeKeywords ?? []
          ).join(", "),
          remoteOnly: profile.jobPreferences?.remoteOnly ?? true,
          resume: profile.resume,
        })
      } catch {
        toast.error("Failed to load profile.")
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [])

  function updateField<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleResumeUpload(file: File | null) {
    if (!file) return

    setUploading(true)
    try {
      const body = new FormData()
      body.append("resume", file)

      const response = await fetch("/api/profile/resume", {
        method: "POST",
        body,
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Resume upload failed.")
        return
      }

      updateField("resume", data.resume)
      toast.success("Resume uploaded.")
    } catch {
      toast.error("Resume upload failed.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          country: form.country,
          city: form.city,
          timezone: form.timezone,
          experienceYears: form.experienceYears,
          primaryRole: form.primaryRole,
          preferredJobType: form.preferredJobType,
          workPreference: form.workPreference,
          englishLevel: form.englishLevel,
          githubUrl: form.githubUrl,
          linkedinUrl: form.linkedinUrl,
          portfolioUrl: form.portfolioUrl,
          expectedSalary: form.expectedSalary,
          salaryPeriod: form.salaryPeriod,
          noticePeriod: form.noticePeriod,
          availableHoursPerWeek: form.availableHoursPerWeek,
          preferredTechStack: form.preferredTechStack,
          preferredCompanySize: form.preferredCompanySize,
          preferredIndustries: form.preferredIndustries,
          willingOverlapUsEu: form.willingOverlapUsEu,
          degree: form.degree,
          university: form.university,
          graduationYear: form.graduationYear,
          certifications: form.certifications,
          careerGoal: form.careerGoal,
          skills: form.skills.map(({ name, years, level }) => ({
            name,
            years,
            level,
          })),
          projects: form.projects.map((project) => ({
            title: project.title,
            description: project.description,
            techStack: project.techStack,
            githubUrl: project.githubUrl,
            liveUrl: project.liveUrl,
          })),
          jobPreferences: {
            targetRoles: form.targetRoles,
            targetCountries: form.targetCountries,
            includeKeywords: form.includeKeywords,
            excludeKeywords: form.excludeKeywords,
            remoteOnly: form.remoteOnly,
          },
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Failed to save profile.")
        return
      }

      toast.success("Profile saved.")
    } catch {
      toast.error("Failed to save profile.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <form
      id={formId}
      className="flex flex-col gap-6 pb-24"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
    >
      <SectionCard
        title="Core profile"
        description="Minimum fields the AI needs to match jobs and fill applications."
        required
      >
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="fullName">Full name</FieldLabel>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <Input
              id="country"
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              placeholder="Pakistan"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input
              id="city"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="Lahore"
            />
            <FieldDescription>Recommended for better targeting</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <ProfileSelect
              value={form.timezone}
              onValueChange={(value) => updateField("timezone", value)}
              placeholder="Select timezone"
              options={TIMEZONES}
            />
          </Field>
          <Field>
            <FieldLabel>Years of experience</FieldLabel>
            <ProfileSelect
              value={form.experienceYears}
              onValueChange={(value) => updateField("experienceYears", value)}
              placeholder="Select experience"
              options={EXPERIENCE_YEAR_OPTIONS}
            />
          </Field>
          <Field>
            <FieldLabel>Primary role</FieldLabel>
            <ProfileSelect
              value={form.primaryRole}
              onValueChange={(value) => updateField("primaryRole", value)}
              placeholder="Select role"
              options={PRIMARY_ROLES}
            />
          </Field>
          <Field>
            <FieldLabel>Preferred job type</FieldLabel>
            <ProfileSelect
              value={form.preferredJobType}
              onValueChange={(value) => updateField("preferredJobType", value)}
              placeholder="Select job type"
              options={JOB_TYPES}
            />
          </Field>
          <Field>
            <FieldLabel>Work preference</FieldLabel>
            <ProfileSelect
              value={form.workPreference}
              onValueChange={(value) => updateField("workPreference", value)}
              placeholder="Select preference"
              options={WORK_PREFERENCES}
            />
          </Field>
          <Field>
            <FieldLabel>English level</FieldLabel>
            <ProfileSelect
              value={form.englishLevel}
              onValueChange={(value) => updateField("englishLevel", value)}
              placeholder="Select level"
              options={ENGLISH_LEVELS}
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard
        title="Skills"
        description="Structured skills are the main matching signal for the AI agent."
        required
      >
        <div className="flex flex-col gap-3">
          {form.skills.map((skill, index) => (
            <div
              key={skill.key}
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.4fr_1fr_1fr_auto]"
            >
              <Field>
                <FieldLabel>Skill</FieldLabel>
                <Input
                  list="common-skills"
                  placeholder="Select or type skill"
                  value={skill.name}
                  onChange={(event) => {
                    const next = [...form.skills]
                    next[index] = { ...skill, name: event.target.value }
                    updateField("skills", next)
                  }}
                />
              </Field>
              <Field>
                <FieldLabel>Experience</FieldLabel>
                <ProfileSelect
                  value={skill.years}
                  onValueChange={(value) => {
                    const next = [...form.skills]
                    next[index] = { ...skill, years: value }
                    updateField("skills", next)
                  }}
                  placeholder="Select..."
                  options={SKILL_EXPERIENCE_OPTIONS}
                />
              </Field>
              <Field>
                <FieldLabel>Level</FieldLabel>
                <ProfileSelect
                  value={skill.level}
                  onValueChange={(value) => {
                    const next = [...form.skills]
                    next[index] = { ...skill, level: value }
                    updateField("skills", next)
                  }}
                  placeholder="Select..."
                  options={SKILL_LEVEL_OPTIONS}
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={form.skills.length === 1}
                  onClick={() => {
                    updateField(
                      "skills",
                      form.skills.filter((item) => item.key !== skill.key),
                    )
                  }}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          <datalist id="common-skills">
            {COMMON_SKILLS.map((skill) => (
              <option key={skill} value={skill} />
            ))}
          </datalist>
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => updateField("skills", [...form.skills, emptySkill()])}
          >
            <PlusIcon className="size-4" />
            Add skill
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Resume"
        description="Upload a PDF or Word resume so the AI can parse and optimize it."
        required
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm hover:bg-muted/40">
            <UploadIcon className="size-4" />
            {uploading ? "Uploading..." : "Upload resume"}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                void handleResumeUpload(event.target.files?.[0] ?? null)
                event.target.value = ""
              }}
            />
          </label>
          {form.resume ? (
            <p className="text-sm text-muted-foreground">
              Current: <span className="text-foreground">{form.resume.fileName}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Professional links"
        description="Helps the AI reference your public work in applications."
      >
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="githubUrl">GitHub URL</FieldLabel>
            <Input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/you"
              value={form.githubUrl}
              onChange={(event) => updateField("githubUrl", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="linkedinUrl">LinkedIn URL</FieldLabel>
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/you"
              value={form.linkedinUrl}
              onChange={(event) =>
                updateField("linkedinUrl", event.target.value)
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="portfolioUrl">Portfolio website</FieldLabel>
            <Input
              id="portfolioUrl"
              type="url"
              placeholder="https://yoursite.com"
              value={form.portfolioUrl}
              onChange={(event) =>
                updateField("portfolioUrl", event.target.value)
              }
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard
        title="Salary & availability"
        description="Used for filtering roles that match your expectations."
      >
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="expectedSalary">Expected salary (USD)</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="expectedSalary"
                type="number"
                min={0}
                placeholder="80000"
                value={form.expectedSalary}
                onChange={(event) =>
                  updateField("expectedSalary", event.target.value)
                }
              />
              <ProfileSelect
                value={form.salaryPeriod}
                onValueChange={(value) => updateField("salaryPeriod", value)}
                placeholder="Period"
                options={SALARY_PERIODS.map((period) => ({
                  value: period,
                  label: period === "month" ? "Per month" : "Per year",
                }))}
                className="w-36"
              />
            </div>
          </Field>
          <Field>
            <FieldLabel>Notice period</FieldLabel>
            <ProfileSelect
              value={form.noticePeriod}
              onValueChange={(value) => updateField("noticePeriod", value)}
              placeholder="Select notice period"
              options={NOTICE_PERIODS}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="availableHours">
              Available hours per week
            </FieldLabel>
            <Input
              id="availableHours"
              type="number"
              min={1}
              max={80}
              placeholder="40"
              value={form.availableHoursPerWeek}
              onChange={(event) =>
                updateField("availableHoursPerWeek", event.target.value)
              }
            />
          </Field>
          <Field orientation="horizontal" className="items-center pt-6">
            <Switch
              checked={form.willingOverlapUsEu}
              onCheckedChange={(checked) =>
                updateField("willingOverlapUsEu", checked)
              }
            />
            <FieldLabel>Willing to overlap with US/EU hours</FieldLabel>
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard
        title="Job preferences"
        description="Narrow recommendations by stack, company size, and industry."
      >
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="preferredTechStack">
              Preferred tech stack
            </FieldLabel>
            <Input
              id="preferredTechStack"
              placeholder="Next.js, TypeScript, PostgreSQL"
              value={form.preferredTechStack}
              onChange={(event) =>
                updateField("preferredTechStack", event.target.value)
              }
            />
            <FieldDescription>Comma-separated</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Preferred company size</FieldLabel>
            <ProfileSelect
              value={form.preferredCompanySize}
              onValueChange={(value) =>
                updateField("preferredCompanySize", value)
              }
              placeholder="Select company size"
              options={COMPANY_SIZES}
            />
          </Field>
          <Field>
            <FieldLabel>Preferred industries</FieldLabel>
            <ChipToggle
              options={INDUSTRIES}
              values={form.preferredIndustries}
              onChange={(values) => updateField("preferredIndustries", values)}
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard
        title="Education & certifications"
        description="Optional context for resumes and senior role screening."
      >
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="degree">Degree</FieldLabel>
            <Input
              id="degree"
              placeholder="B.S. Computer Science"
              value={form.degree}
              onChange={(event) => updateField("degree", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="university">University</FieldLabel>
            <Input
              id="university"
              value={form.university}
              onChange={(event) =>
                updateField("university", event.target.value)
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="graduationYear">Graduation year</FieldLabel>
            <Input
              id="graduationYear"
              type="number"
              min={1970}
              max={2100}
              placeholder="2022"
              value={form.graduationYear}
              onChange={(event) =>
                updateField("graduationYear", event.target.value)
              }
            />
          </Field>
          <Field className="md:col-span-3">
            <FieldLabel htmlFor="certifications">Certifications</FieldLabel>
            <Input
              id="certifications"
              placeholder="AWS, Google Cloud, CCNA"
              value={form.certifications}
              onChange={(event) =>
                updateField("certifications", event.target.value)
              }
            />
            <FieldDescription>Comma-separated</FieldDescription>
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard
        title="Portfolio projects"
        description="Projects the AI can highlight in resumes and cover letters."
      >
        <div className="flex flex-col gap-4">
          {form.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects added yet.
            </p>
          ) : null}
          {form.projects.map((project, index) => (
            <FieldSet
              key={project.key}
              className="rounded-lg border p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <FieldLegend>Project {index + 1}</FieldLegend>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    updateField(
                      "projects",
                      form.projects.filter((item) => item.key !== project.key),
                    )
                  }}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
              <FieldGroup className="grid gap-3 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    value={project.title}
                    onChange={(event) => {
                      const next = [...form.projects]
                      next[index] = { ...project, title: event.target.value }
                      updateField("projects", next)
                    }}
                  />
                </Field>
                <Field className="md:col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    value={project.description}
                    onChange={(event) => {
                      const next = [...form.projects]
                      next[index] = {
                        ...project,
                        description: event.target.value,
                      }
                      updateField("projects", next)
                    }}
                  />
                </Field>
                <Field className="md:col-span-2">
                  <FieldLabel>Tech stack</FieldLabel>
                  <Input
                    placeholder="React, Node.js, PostgreSQL"
                    value={project.techStack}
                    onChange={(event) => {
                      const next = [...form.projects]
                      next[index] = {
                        ...project,
                        techStack: event.target.value,
                      }
                      updateField("projects", next)
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>GitHub link</FieldLabel>
                  <Input
                    type="url"
                    value={project.githubUrl}
                    onChange={(event) => {
                      const next = [...form.projects]
                      next[index] = {
                        ...project,
                        githubUrl: event.target.value,
                      }
                      updateField("projects", next)
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>Live URL</FieldLabel>
                  <Input
                    type="url"
                    value={project.liveUrl}
                    onChange={(event) => {
                      const next = [...form.projects]
                      next[index] = {
                        ...project,
                        liveUrl: event.target.value,
                      }
                      updateField("projects", next)
                    }}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() =>
              updateField("projects", [...form.projects, emptyProject()])
            }
          >
            <PlusIcon className="size-4" />
            Add project
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="AI matching preferences"
        description="Multi-role filters for worldwide search. Countries are soft preferences — search is not locked to one region."
      >
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="careerGoal">Career goal</FieldLabel>
            <Textarea
              id="careerGoal"
              placeholder="Land remote roles matching my skills across startups and product companies worldwide"
              value={form.careerGoal}
              onChange={(event) =>
                updateField("careerGoal", event.target.value)
              }
            />
          </Field>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.remoteOnly}
              onCheckedChange={(checked) => updateField("remoteOnly", checked)}
              id="remoteOnly"
            />
            <FieldLabel htmlFor="remoteOnly">
              Prefer remote / worldwide listings
            </FieldLabel>
          </div>
          <Field>
            <FieldLabel>Target roles (pick multiple)</FieldLabel>
            <ChipToggle
              options={TARGET_ROLES}
              values={form.targetRoles}
              onChange={(values) => updateField("targetRoles", values)}
            />
          </Field>
          <Field>
            <FieldLabel>Preferred countries (optional soft filter)</FieldLabel>
            <ChipToggle
              options={TARGET_COUNTRIES}
              values={form.targetCountries}
              onChange={(values) => updateField("targetCountries", values)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="includeKeywords">Include keywords</FieldLabel>
            <Input
              id="includeKeywords"
              placeholder="Next.js, TypeScript, AI, RAG"
              value={form.includeKeywords}
              onChange={(event) =>
                updateField("includeKeywords", event.target.value)
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="excludeKeywords">Exclude keywords</FieldLabel>
            <Input
              id="excludeKeywords"
              placeholder="WordPress, Magento, PHP-only"
              value={form.excludeKeywords}
              onChange={(event) =>
                updateField("excludeKeywords", event.target.value)
              }
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={saving || uploading}>
            {saving ? (
              <>
                <Spinner data-icon="inline-start" />
                Saving...
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
