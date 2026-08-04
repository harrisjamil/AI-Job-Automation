"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon, RadarIcon, ZapIcon } from "lucide-react"
import { CrawlRunner } from "@/components/admin/crawl-runner"
import {
  JobDetailDrawer,
} from "@/components/admin/job-detail-drawer"
import {
  JobsTable,
  type JobListItem,
} from "@/components/admin/jobs-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function DiscoverJobsPanel() {
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [hasContact, setHasContact] = useState(false)
  const [enrichingId, setEnrichingId] = useState<string | null>(null)
  const [batchEnriching, setBatchEnriching] = useState(false)
  const [batchApplying, setBatchApplying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      if (remoteOnly) params.set("remote", "1")
      if (hasContact) params.set("hasContact", "1")
      params.set("limit", "80")

      const response = await fetch(`/api/jobs?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load jobs")
        return
      }
      setJobs(data.jobs ?? [])
    } catch {
      toast.error("Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }, [q, remoteOnly, hasContact])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  async function handleEnrich(jobId: string) {
    setEnrichingId(jobId)
    try {
      const response = await fetch(`/api/jobs/${jobId}/enrich`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Enrich failed")
        return
      }
      toast.success(
        data.contacts?.length
          ? `Found ${data.contacts.length} email(s)`
          : "No emails found"
      )
      await loadJobs()
    } catch {
      toast.error("Enrich failed")
    } finally {
      setEnrichingId(null)
    }
  }

  async function handleBatchEnrich() {
    setBatchEnriching(true)
    try {
      const response = await fetch("/api/jobs/enrich-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 12, minScore: 12 }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Batch enrich failed")
        return
      }
      const found = (data.results as Array<{ contacts: number }>).reduce(
        (sum, item) => sum + item.contacts,
        0
      )
      toast.success(`Batch done — ${found} contact(s) found`)
      await loadJobs()
    } catch {
      toast.error("Batch enrich failed")
    } finally {
      setBatchEnriching(false)
    }
  }

  async function handleBatchAutoApply() {
    setBatchApplying(true)
    try {
      const response = await fetch("/api/auto-apply/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5 }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Batch auto-apply failed")
        return
      }
      toast.success(
        `Auto-apply prepared ${data.succeeded}/${data.attempted} job(s) (score ≥ ${data.minScore})`
      )
      const firstOk = (
        data.results as Array<{ ok: boolean; applyUrl?: string }>
      ).find((item) => item.ok && item.applyUrl)
      if (firstOk?.applyUrl) {
        window.open(firstOk.applyUrl, "_blank", "noopener,noreferrer")
      }
      await loadJobs()
    } catch {
      toast.error("Batch auto-apply failed")
    } finally {
      setBatchApplying(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CrawlRunner onCompleted={() => void loadJobs()} />

      <div className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-end md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="job-search">Search</Label>
            <Input
              id="job-search"
              placeholder="Title, company, location"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadJobs()
              }}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={remoteOnly}
              onCheckedChange={setRemoteOnly}
              id="remote-only"
            />
            <Label htmlFor="remote-only">Remote only</Label>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={hasContact}
              onCheckedChange={setHasContact}
              id="has-contact"
            />
            <Label htmlFor="has-contact">Has email</Label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadJobs()}>
            Apply filters
          </Button>
          <Button
            variant="secondary"
            disabled={batchEnriching}
            onClick={() => void handleBatchEnrich()}
          >
            {batchEnriching ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <RadarIcon className="size-3.5" />
            )}
            Enrich top matches
          </Button>
          <Button
            disabled={batchApplying}
            onClick={() => void handleBatchAutoApply()}
          >
            {batchApplying ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <ZapIcon className="size-3.5" />
            )}
            Auto-apply top matches
          </Button>
        </div>
      </div>

      <JobsTable
        jobs={jobs}
        loading={loading}
        enrichingId={enrichingId}
        onSelect={(job) => {
          setSelectedId(job.id)
          setDrawerOpen(true)
        }}
        onEnrich={(jobId) => void handleEnrich(jobId)}
      />

      <JobDetailDrawer
        jobId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={() => void loadJobs()}
      />
    </div>
  )
}
