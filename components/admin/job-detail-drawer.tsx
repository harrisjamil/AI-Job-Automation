"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  BookmarkPlusIcon,
  CopyIcon,
  ExternalLinkIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  MailIcon,
  RadarIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { JobListItem } from "@/components/admin/jobs-table"

type JobDetail = Omit<JobListItem, "contacts"> & {
  description: string | null
  salary: string | null
  postedAt: string | null
  outreachEmails: Array<{
    id: string
    toEmail: string
    subject: string
    body: string
    status: string
    sentAt: string | null
    error: string | null
  }>
  contacts: Array<{
    id: string
    email: string
    name: string | null
    role: string | null
    confidence: number
  }>
}

type JobDocument = {
  id: string
  type: string
  title: string | null
  content: string
}

type ApplyPackage = {
  coverLetter: { content: string }
  tailoredResume: { content: string }
  profileAnswers: {
    fullName: string
    email: string
    linkedinUrl: string | null
    githubUrl: string | null
    expectedSalary: number | null
    salaryPeriod: string | null
    noticePeriod: string | null
  }
  checklist: string[]
}

type GapAnalysis = {
  matchSummary: string
  overlappingSkills: string[]
  missingSkills: string[]
  rewriteBullets: string[]
  emphasize: string[]
  risks: string[]
  scoreHint: number
}

type InterviewPrep = {
  likelyQuestions: Array<{ question: string; tip: string }>
  starStories: Array<{
    title: string
    situation: string
    action: string
    result: string
  }>
  talkingPoints: string[]
  questionsToAsk: string[]
  cheatSheet: string
}

type DrawerTab =
  | "outreach"
  | "cover_letter"
  | "tailored_resume"
  | "auto_apply"
  | "gap"
  | "interview"

export function JobDetailDrawer({
  jobId,
  open,
  onOpenChange,
  onUpdated,
}: {
  jobId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}) {
  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [docGenerating, setDocGenerating] = useState(false)
  const [docSaving, setDocSaving] = useState(false)
  const [autoApplying, setAutoApplying] = useState(false)
  const [applyPackage, setApplyPackage] = useState<ApplyPackage | null>(null)
  const [gap, setGap] = useState<GapAnalysis | null>(null)
  const [gapLoading, setGapLoading] = useState(false)
  const [interview, setInterview] = useState<InterviewPrep | null>(null)
  const [interviewLoading, setInterviewLoading] = useState(false)
  const [tab, setTab] = useState<DrawerTab>("outreach")
  const [toEmail, setToEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [activeOutreachId, setActiveOutreachId] = useState<string | null>(null)
  const [coverDoc, setCoverDoc] = useState<JobDocument | null>(null)
  const [resumeDoc, setResumeDoc] = useState<JobDocument | null>(null)
  const [coverTitle, setCoverTitle] = useState("")
  const [coverContent, setCoverContent] = useState("")
  const [resumeTitle, setResumeTitle] = useState("")
  const [resumeContent, setResumeContent] = useState("")

  useEffect(() => {
    if (!open || !jobId) return

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [jobResponse, docsResponse] = await Promise.all([
          fetch(`/api/jobs/${jobId}`),
          fetch(`/api/documents?jobId=${jobId}`),
        ])
        const data = await jobResponse.json()
        if (!jobResponse.ok) {
          toast.error(data.error ?? "Failed to load job")
          return
        }
        if (cancelled) return
        const next = data.job as JobDetail
        setJob(next)
        const primary = next.contacts[0]
        setToEmail(primary?.email ?? "")
        const draft = next.outreachEmails.find((item) => item.status === "draft")
        if (draft) {
          setActiveOutreachId(draft.id)
          setSubject(draft.subject)
          setBody(draft.body)
          setToEmail(draft.toEmail)
        } else {
          setActiveOutreachId(null)
          setSubject("")
          setBody("")
        }

        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          const documents = (docsData.documents ?? []) as JobDocument[]
          const cover = documents.find((d) => d.type === "cover_letter") ?? null
          const tailored =
            documents.find((d) => d.type === "tailored_resume") ?? null
          setCoverDoc(cover)
          setResumeDoc(tailored)
          setCoverTitle(cover?.title ?? "")
          setCoverContent(cover?.content ?? "")
          setResumeTitle(tailored?.title ?? "")
          setResumeContent(tailored?.content ?? "")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, jobId])

  async function handleEnrich() {
    if (!jobId) return
    setEnriching(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/enrich`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Could not extract contacts")
        return
      }
      toast.success(
        data.contacts?.length
          ? `Found ${data.contacts.length} contact(s)`
          : "No emails found on this listing"
      )
      const reload = await fetch(`/api/jobs/${jobId}`)
      const reloadData = await reload.json()
      if (reload.ok) {
        const next = reloadData.job as JobDetail
        setJob(next)
        if (!toEmail && next.contacts[0]) {
          setToEmail(next.contacts[0].email)
        }
      }
      onUpdated?.()
    } catch {
      toast.error("Could not extract contacts")
    } finally {
      setEnriching(false)
    }
  }

  async function handleTrack(status: "saved" | "applied" = "saved") {
    if (!jobId) return
    setTracking(true)
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Could not track application")
        return
      }
      toast.success(
        status === "applied"
          ? "Marked as applied in tracker"
          : "Saved to application tracker"
      )
      onUpdated?.()
    } catch {
      toast.error("Could not track application")
    } finally {
      setTracking(false)
    }
  }

  async function handleDraft() {
    if (!jobId || !toEmail) {
      toast.error("Add a recipient email first")
      return
    }
    setDrafting(true)
    try {
      const contactId = job?.contacts.find((c) => c.email === toEmail)?.id
      const response = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          toEmail,
          contactId,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to draft email")
        return
      }
      setActiveOutreachId(data.email.id)
      setSubject(data.email.subject)
      setBody(data.email.body)
      toast.success("Draft ready — review before sending")
      onUpdated?.()
    } catch {
      toast.error("Failed to draft email")
    } finally {
      setDrafting(false)
    }
  }

  async function handleSaveDraft() {
    if (!activeOutreachId) {
      toast.error("Create an AI draft first")
      return
    }
    const response = await fetch(`/api/outreach/${activeOutreachId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail, subject, body }),
    })
    const data = await response.json()
    if (!response.ok) {
      toast.error(data.error ?? "Failed to save draft")
      return
    }
    toast.success("Draft saved")
  }

  async function handleSend() {
    if (!activeOutreachId) {
      toast.error("Create and review a draft first")
      return
    }
    setSending(true)
    try {
      await fetch(`/api/outreach/${activeOutreachId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail, subject, body }),
      })
      const response = await fetch(`/api/outreach/${activeOutreachId}/send`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Send failed")
        return
      }
      toast.success("Email sent")
      if (jobId) {
        void fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, status: "outreach" }),
        })
      }
      onUpdated?.()
      if (jobId) {
        const reload = await fetch(`/api/jobs/${jobId}`)
        const reloadData = await reload.json()
        if (reload.ok) setJob(reloadData.job)
      }
    } catch {
      toast.error("Send failed")
    } finally {
      setSending(false)
    }
  }

  async function handleGenerateDocument(type: "cover_letter" | "tailored_resume") {
    if (!jobId) return
    setDocGenerating(true)
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, type }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to generate document")
        return
      }
      const document = data.document as JobDocument
      if (type === "cover_letter") {
        setCoverDoc(document)
        setCoverTitle(document.title ?? "")
        setCoverContent(document.content)
        toast.success("Cover letter ready")
      } else {
        setResumeDoc(document)
        setResumeTitle(document.title ?? "")
        setResumeContent(document.content)
        toast.success("Tailored resume ready")
      }
    } catch {
      toast.error("Failed to generate document")
    } finally {
      setDocGenerating(false)
    }
  }

  async function handleSaveDocument(type: "cover_letter" | "tailored_resume") {
    const doc = type === "cover_letter" ? coverDoc : resumeDoc
    if (!doc) {
      toast.error("Generate a document first")
      return
    }
    setDocSaving(true)
    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "cover_letter"
            ? { title: coverTitle, content: coverContent }
            : { title: resumeTitle, content: resumeContent }
        ),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to save")
        return
      }
      const document = data.document as JobDocument
      if (type === "cover_letter") setCoverDoc(document)
      else setResumeDoc(document)
      toast.success("Saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setDocSaving(false)
    }
  }

  async function handleCopy(text: string, label: string) {
    if (!text.trim()) {
      toast.error(`Nothing to copy — generate a ${label} first`)
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  async function handleAutoApply(regenerate = false) {
    if (!jobId) return
    setAutoApplying(true)
    setTab("auto_apply")
    try {
      const response = await fetch(`/api/jobs/${jobId}/auto-apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateDocuments: regenerate }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Auto-apply failed")
        return
      }
      const pkg = data.applyPackage as ApplyPackage
      setApplyPackage(pkg)
      setCoverContent(pkg.coverLetter.content)
      setResumeContent(pkg.tailoredResume.content)
      if (data.applyUrl) {
        window.open(data.applyUrl, "_blank", "noopener,noreferrer")
      }
      toast.success(
        data.markedApplied
          ? "Materials ready — marked Applied and opened posting"
          : "Materials ready — opened posting"
      )
      onUpdated?.()
    } catch {
      toast.error("Auto-apply failed")
    } finally {
      setAutoApplying(false)
    }
  }

  async function handleGapAnalysis() {
    if (!jobId) return
    setGapLoading(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/gap-analysis`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Gap analysis failed")
        return
      }
      setGap(data.analysis as GapAnalysis)
      toast.success("Gap analysis ready")
    } catch {
      toast.error("Gap analysis failed")
    } finally {
      setGapLoading(false)
    }
  }

  async function handleInterviewPrep() {
    if (!jobId) return
    setInterviewLoading(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}/interview-prep`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Interview prep failed")
        return
      }
      setInterview(data.prep as InterviewPrep)
      toast.success("Interview prep ready")
    } catch {
      toast.error("Interview prep failed")
    } finally {
      setInterviewLoading(false)
    }
  }

  function downloadPdf(type: "cover_letter" | "tailored_resume") {
    if (!jobId) return
    window.open(`/api/jobs/${jobId}/pdf?type=${type}`, "_blank")
  }

  const plainDescription = (job?.description ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const tabs: Array<{ id: DrawerTab; label: string }> = [
    { id: "outreach", label: "Outreach" },
    { id: "cover_letter", label: "Cover letter" },
    { id: "tailored_resume", label: "Resume" },
    { id: "auto_apply", label: "Auto-apply" },
    { id: "gap", label: "Gap" },
    { id: "interview", label: "Interview" },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{job?.title ?? "Job details"}</SheetTitle>
          <SheetDescription>
            {job
              ? `${job.company || "Company"} · ${job.location || "Worldwide"}`
              : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        {loading || !job ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading job…
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-4 pb-8">
            <div className="flex flex-wrap gap-2">
              <Badge>Score {job.matchScore}</Badge>
              {job.isRemote ? <Badge variant="secondary">Remote</Badge> : null}
              <Badge variant="outline" className="capitalize">
                {job.source}
              </Badge>
              {job.salary ? <Badge variant="outline">{job.salary}</Badge> : null}
              {job.postedAt ? (
                <Badge variant="outline">
                  Posted {new Date(job.postedAt).toLocaleDateString()}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a href={job.url} target="_blank" rel="noreferrer" />
                }
              >
                <ExternalLinkIcon className="size-3.5" />
                Open posting
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={tracking}
                onClick={() => void handleTrack("saved")}
              >
                {tracking ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <BookmarkPlusIcon className="size-3.5" />
                )}
                Track application
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={tracking}
                onClick={() => void handleTrack("applied")}
              >
                Mark applied
              </Button>
              <Button
                size="sm"
                disabled={autoApplying}
                onClick={() => void handleAutoApply(false)}
              >
                {autoApplying ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <ZapIcon className="size-3.5" />
                )}
                Auto-apply
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={enriching}
                onClick={() => void handleEnrich()}
              >
                {enriching ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <RadarIcon className="size-3.5" />
                )}
                Extract emails
              </Button>
            </div>

            {job.skillsMatched.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Matched skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.skillsMatched.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contacts
              </p>
              {job.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No emails extracted yet. Run extract on the posting page.
                </p>
              ) : (
                <ul className="space-y-2">
                  {job.contacts.map((contact) => (
                    <li
                      key={contact.id}
                      className="flex items-start justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{contact.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {[contact.name, contact.role]
                            .filter(Boolean)
                            .join(" · ") || "Contact"}
                          {" · "}
                          {Math.round(contact.confidence * 100)}% confidence
                        </p>
                      </div>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setToEmail(contact.email)
                          setTab("outreach")
                        }}
                      >
                        Use
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted/60 p-1">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      tab === item.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === "outreach" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MailIcon className="size-4" />
                    <p className="font-medium">Outreach email</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toEmail">To</Label>
                    <Input
                      id="toEmail"
                      value={toEmail}
                      onChange={(event) => setToEmail(event.target.value)}
                      placeholder="recruiter@company.com"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={drafting}
                      onClick={() => void handleDraft()}
                    >
                      {drafting ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <SparklesIcon className="size-3.5" />
                      )}
                      AI draft
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSaveDraft()}
                    >
                      Save draft
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={sending}
                      onClick={() => void handleSend()}
                    >
                      {sending ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : null}
                      Send
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Body</Label>
                    <Textarea
                      id="body"
                      rows={10}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              {tab === "cover_letter" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="size-4" />
                    <p className="font-medium">Cover letter</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={docGenerating}
                      onClick={() => void handleGenerateDocument("cover_letter")}
                    >
                      {docGenerating ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <SparklesIcon className="size-3.5" />
                      )}
                      Generate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={docSaving || !coverDoc}
                      onClick={() => void handleSaveDocument("cover_letter")}
                    >
                      {docSaving ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : null}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void handleCopy(coverContent, "Cover letter")
                      }
                    >
                      <CopyIcon className="size-3.5" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!coverDoc && !coverContent}
                      onClick={() => downloadPdf("cover_letter")}
                    >
                      <DownloadIcon className="size-3.5" />
                      PDF
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverTitle">Title</Label>
                    <Input
                      id="coverTitle"
                      value={coverTitle}
                      onChange={(event) => setCoverTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverContent">Letter</Label>
                    <Textarea
                      id="coverContent"
                      rows={12}
                      value={coverContent}
                      onChange={(event) => setCoverContent(event.target.value)}
                      placeholder="Generate a cover letter tailored to this role…"
                    />
                  </div>
                </div>
              ) : null}

              {tab === "tailored_resume" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="size-4" />
                    <p className="font-medium">Tailored resume</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={docGenerating}
                      onClick={() =>
                        void handleGenerateDocument("tailored_resume")
                      }
                    >
                      {docGenerating ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <SparklesIcon className="size-3.5" />
                      )}
                      Generate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={docSaving || !resumeDoc}
                      onClick={() => void handleSaveDocument("tailored_resume")}
                    >
                      {docSaving ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : null}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void handleCopy(resumeContent, "Tailored resume")
                      }
                    >
                      <CopyIcon className="size-3.5" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!resumeDoc && !resumeContent}
                      onClick={() => downloadPdf("tailored_resume")}
                    >
                      <DownloadIcon className="size-3.5" />
                      PDF
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resumeTitle">Title</Label>
                    <Input
                      id="resumeTitle"
                      value={resumeTitle}
                      onChange={(event) => setResumeTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resumeContent">Markdown</Label>
                    <Textarea
                      id="resumeContent"
                      rows={14}
                      value={resumeContent}
                      onChange={(event) => setResumeContent(event.target.value)}
                      placeholder="Generate a resume tailored to this role…"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              ) : null}

              {tab === "auto_apply" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ZapIcon className="size-4" />
                    <p className="font-medium">Auto-apply package</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Generates a cover letter and tailored resume, updates your
                    tracker, then opens the employer posting so you can paste
                    into their form.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={autoApplying}
                      onClick={() => void handleAutoApply(false)}
                    >
                      {autoApplying ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <ZapIcon className="size-3.5" />
                      )}
                      Prepare & open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={autoApplying}
                      onClick={() => void handleAutoApply(true)}
                    >
                      Regenerate materials
                    </Button>
                    {job.url ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        nativeButton={false}
                        render={
                          <a href={job.url} target="_blank" rel="noreferrer" />
                        }
                      >
                        <ExternalLinkIcon className="size-3.5" />
                        Open posting
                      </Button>
                    ) : null}
                  </div>

                  {applyPackage ? (
                    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Checklist
                      </p>
                      <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                        {applyPackage.checklist.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void handleCopy(
                              applyPackage.coverLetter.content,
                              "Cover letter"
                            )
                          }
                        >
                          <CopyIcon className="size-3.5" />
                          Copy cover letter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void handleCopy(
                              applyPackage.tailoredResume.content,
                              "Resume"
                            )
                          }
                        >
                          <CopyIcon className="size-3.5" />
                          Copy resume
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void handleCopy(
                              [
                                applyPackage.profileAnswers.fullName,
                                applyPackage.profileAnswers.email,
                                applyPackage.profileAnswers.linkedinUrl,
                                applyPackage.profileAnswers.githubUrl,
                                applyPackage.profileAnswers.expectedSalary
                                  ? `Salary: ${applyPackage.profileAnswers.expectedSalary}${applyPackage.profileAnswers.salaryPeriod ? ` / ${applyPackage.profileAnswers.salaryPeriod}` : ""}`
                                  : null,
                                applyPackage.profileAnswers.noticePeriod
                                  ? `Notice: ${applyPackage.profileAnswers.noticePeriod}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join("\n"),
                              "Profile answers"
                            )
                          }
                        >
                          <CopyIcon className="size-3.5" />
                          Copy profile answers
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Run Prepare & open to build your apply package.
                    </p>
                  )}
                </div>
              ) : null}

              {tab === "gap" ? (
                <div className="space-y-3">
                  <p className="font-medium">JD gap analysis</p>
                  <Button
                    size="sm"
                    disabled={gapLoading}
                    onClick={() => void handleGapAnalysis()}
                  >
                    {gapLoading ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <SparklesIcon className="size-3.5" />
                    )}
                    Analyze fit
                  </Button>
                  {gap ? (
                    <div className="space-y-3 text-sm">
                      <p>{gap.matchSummary}</p>
                      <p>
                        <span className="font-medium">Score hint:</span>{" "}
                        {gap.scoreHint}
                      </p>
                      <div>
                        <p className="font-medium">Overlap</p>
                        <p className="text-muted-foreground">
                          {gap.overlappingSkills.join(", ") || "None"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Missing</p>
                        <p className="text-muted-foreground">
                          {gap.missingSkills.join(", ") || "None"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Rewrite bullets</p>
                        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                          {gap.rewriteBullets.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Emphasize</p>
                        <p className="text-muted-foreground">
                          {gap.emphasize.join(", ")}
                        </p>
                      </div>
                      {gap.risks.length > 0 ? (
                        <div>
                          <p className="font-medium">Risks</p>
                          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                            {gap.risks.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Run analysis to see skill gaps and rewrite guidance.
                    </p>
                  )}
                </div>
              ) : null}

              {tab === "interview" ? (
                <div className="space-y-3">
                  <p className="font-medium">Interview prep</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={interviewLoading}
                      onClick={() => void handleInterviewPrep()}
                    >
                      {interviewLoading ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <SparklesIcon className="size-3.5" />
                      )}
                      Generate pack
                    </Button>
                    {interview ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void handleCopy(
                            interview.cheatSheet,
                            "Interview cheat sheet"
                          )
                        }
                      >
                        <CopyIcon className="size-3.5" />
                        Copy cheat sheet
                      </Button>
                    ) : null}
                  </div>
                  {interview ? (
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="font-medium">Likely questions</p>
                        <ul className="mt-1 space-y-2">
                          {interview.likelyQuestions.map((item) => (
                            <li key={item.question} className="rounded-lg border p-2">
                              <p className="font-medium">{item.question}</p>
                              <p className="text-muted-foreground">{item.tip}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">STAR stories</p>
                        <ul className="mt-1 space-y-2">
                          {interview.starStories.map((story) => (
                            <li key={story.title} className="rounded-lg border p-2">
                              <p className="font-medium">{story.title}</p>
                              <p className="text-muted-foreground">
                                S: {story.situation}
                              </p>
                              <p className="text-muted-foreground">
                                A: {story.action}
                              </p>
                              <p className="text-muted-foreground">
                                R: {story.result}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Ask them</p>
                        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                          {interview.questionsToAsk.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </div>
                      <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                        {interview.cheatSheet}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Generate a prep pack from this job description and your
                      profile.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {plainDescription ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {plainDescription.slice(0, 12000)}
                  {plainDescription.length > 12000 ? "…" : ""}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
