"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Loader2Icon,
  MailIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type OutreachItem = {
  id: string
  toEmail: string
  subject: string
  body: string
  status: string
  sentAt: string | null
  error: string | null
  createdAt: string
  job: {
    id: string
    title: string
    company: string | null
    url: string
    matchScore: number
    isRemote: boolean
  }
  contact: {
    id: string
    name: string | null
    email: string
    role: string | null
  } | null
}

type ContactJob = {
  id: string
  title: string
  company: string | null
  matchScore: number
  url: string
  contacts: Array<{
    id: string
    email: string
    name: string | null
    role: string | null
  }>
}

export function OutreachPanel() {
  const [emails, setEmails] = useState<OutreachItem[]>([])
  const [contactJobs, setContactJobs] = useState<ContactJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toEmail, setToEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [draftingJobId, setDraftingJobId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [outreachRes, jobsRes] = await Promise.all([
        fetch("/api/outreach"),
        fetch("/api/jobs?hasContact=1&limit=40"),
      ])
      const outreachData = await outreachRes.json()
      const jobsData = await jobsRes.json()
      if (outreachRes.ok) setEmails(outreachData.emails ?? [])
      if (jobsRes.ok) setContactJobs(jobsData.jobs ?? [])
    } catch {
      toast.error("Failed to load outreach data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function selectEmail(item: OutreachItem) {
    setSelectedId(item.id)
    setToEmail(item.toEmail)
    setSubject(item.subject)
    setBody(item.body)
  }

  async function handleSave() {
    if (!selectedId) return
    setSaving(true)
    try {
      const response = await fetch(`/api/outreach/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail, subject, body }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to save")
        return
      }
      toast.success("Draft updated")
      await load()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleSend() {
    if (!selectedId) return
    setSending(true)
    try {
      await fetch(`/api/outreach/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail, subject, body }),
      })
      const response = await fetch(`/api/outreach/${selectedId}/send`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Send failed")
        return
      }
      toast.success("Email sent")
      await load()
    } catch {
      toast.error("Send failed")
    } finally {
      setSending(false)
    }
  }

  async function handleDraftFromContact(
    jobId: string,
    contactId: string,
    email: string
  ) {
    setDraftingJobId(jobId)
    try {
      const response = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, contactId, toEmail: email }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Draft failed")
        return
      }
      toast.success("AI draft created")
      await load()
      selectEmail({
        ...data.email,
        job: {
          id: jobId,
          title: "",
          company: null,
          url: "",
          matchScore: 0,
          isRemote: false,
        },
        contact: null,
      })
      // reload to get full relations
      const list = await fetch("/api/outreach")
      const listData = await list.json()
      if (list.ok) {
        setEmails(listData.emails ?? [])
        const created = (listData.emails as OutreachItem[]).find(
          (item) => item.id === data.email.id
        )
        if (created) selectEmail(created)
      }
    } catch {
      toast.error("Draft failed")
    } finally {
      setDraftingJobId(null)
    }
  }

  const selected = emails.find((item) => item.id === selectedId) ?? null

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="flex flex-col gap-6">
        <section className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium">Jobs with emails</h3>
            <p className="text-sm text-muted-foreground">
              Draft and send outreach for contacts extracted from listings.
            </p>
          </div>
          <div className="divide-y">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : contactJobs.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No contacts yet. Open Discover Jobs and run “Find email” or
                enrich top matches.
              </p>
            ) : (
              contactJobs.map((job) => (
                <div key={job.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.company || "Company"} · score {job.matchScore}
                      </p>
                    </div>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Open posting
                    </a>
                  </div>
                  <div className="flex flex-col gap-2">
                    {job.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{contact.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {[contact.name, contact.role]
                              .filter(Boolean)
                              .join(" · ") || "Contact"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={draftingJobId === job.id}
                          onClick={() =>
                            void handleDraftFromContact(
                              job.id,
                              contact.id,
                              contact.email
                            )
                          }
                        >
                          {draftingJobId === job.id ? (
                            <Loader2Icon className="size-3.5 animate-spin" />
                          ) : (
                            <SparklesIcon className="size-3.5" />
                          )}
                          Draft email
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium">Outreach history</h3>
          </div>
          <div className="divide-y">
            {emails.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No drafts or sent emails yet.
              </p>
            ) : (
              emails.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectEmail(item)}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 ${
                    selectedId === item.id ? "bg-muted/40" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{item.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.job.title}
                      {item.job.company ? ` · ${item.job.company}` : ""} →{" "}
                      {item.toEmail}
                    </p>
                  </div>
                  <Badge
                    variant={
                      item.status === "sent"
                        ? "default"
                        : item.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {item.status}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="h-fit rounded-xl border p-4">
        <div className="mb-4 flex items-center gap-2">
          <MailIcon className="size-4" />
          <h3 className="font-medium">Composer</h3>
        </div>
        {!selected ? (
          <p className="text-sm text-muted-foreground">
            Select an outreach draft or create one from a contact.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selected.job.title}
              {selected.job.company ? ` at ${selected.job.company}` : ""}
            </p>
            <div className="space-y-2">
              <Label htmlFor="outreach-to">To</Label>
              <Input
                id="outreach-to"
                value={toEmail}
                onChange={(event) => setToEmail(event.target.value)}
                disabled={selected.status === "sent"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outreach-subject">Subject</Label>
              <Input
                id="outreach-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                disabled={selected.status === "sent"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outreach-body">Body</Label>
              <Textarea
                id="outreach-body"
                rows={14}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={selected.status === "sent"}
              />
            </div>
            {selected.error ? (
              <p className="text-sm text-destructive">{selected.error}</p>
            ) : null}
            {selected.status !== "sent" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : null}
                  Save
                </Button>
                <Button disabled={sending} onClick={() => void handleSend()}>
                  {sending ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <SendIcon className="size-3.5" />
                  )}
                  Send email
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sent
                {selected.sentAt
                  ? ` on ${new Date(selected.sentAt).toLocaleString()}`
                  : ""}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
