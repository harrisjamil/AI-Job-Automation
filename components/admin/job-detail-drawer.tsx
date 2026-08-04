"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ExternalLinkIcon,
  Loader2Icon,
  MailIcon,
  RadarIcon,
  SparklesIcon,
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
  const [toEmail, setToEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [activeOutreachId, setActiveOutreachId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !jobId) return

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        const data = await response.json()
        if (!response.ok) {
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

  const plainDescription = (job?.description ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

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
                        onClick={() => setToEmail(contact.email)}
                      >
                        Use
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-xl border p-4">
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
