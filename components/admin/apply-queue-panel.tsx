"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  ZapIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type ApplyPackage = {
  coverLetter: { content: string }
  tailoredResume: { content: string }
  profileAnswers: {
    fullName: string
    email: string
    linkedinUrl: string | null
    githubUrl: string | null
  }
}

type QueueRow = {
  id: string
  status: string
  autoApplyStatus: string | null
  applyPackageJson: ApplyPackage | null
  autoPreparedAt: string | null
  job: {
    id: string
    title: string
    company: string | null
    url: string
    matchScore: number
  }
}

export function ApplyQueuePanel() {
  const [rows, setRows] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/applications")
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load queue")
        return
      }
      const apps = (data.applications ?? []) as Array<QueueRow & { job: QueueRow["job"] }>
      setRows(
        apps.filter(
          (app) =>
            app.autoApplyStatus === "ready" ||
            app.autoApplyStatus === "submitted" ||
            Boolean(app.applyPackageJson)
        )
      )
    } catch {
      toast.error("Failed to load queue")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function copySequence(pkg: ApplyPackage) {
    const text = [
      "=== PROFILE ===",
      pkg.profileAnswers.fullName,
      pkg.profileAnswers.email,
      pkg.profileAnswers.linkedinUrl,
      pkg.profileAnswers.githubUrl,
      "",
      "=== COVER LETTER ===",
      pkg.coverLetter.content,
      "",
      "=== RESUME ===",
      pkg.tailoredResume.content,
    ]
      .filter((line) => line !== undefined)
      .join("\n")
    await navigator.clipboard.writeText(text)
    toast.success("Full apply package copied")
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading apply queue…
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center">
        <p className="font-medium">No apply packages yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use Auto-apply on Discover Jobs to prepare packages for this queue.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pkg = row.applyPackageJson
        return (
          <div
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{row.job.title}</p>
                <Badge>Score {row.job.matchScore}</Badge>
                {row.autoApplyStatus ? (
                  <Badge variant="secondary">{row.autoApplyStatus}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {row.job.company || "Company"}
                {row.autoPreparedAt
                  ? ` · prepared ${new Date(row.autoPreparedAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pkg ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void copySequence(pkg)}
                >
                  <CopyIcon className="size-3.5" />
                  Copy all
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                nativeButton={false}
                render={
                  <a href={row.job.url} target="_blank" rel="noreferrer" />
                }
              >
                <ExternalLinkIcon className="size-3.5" />
                Open posting
              </Button>
              <Button
                size="sm"
                nativeButton={false}
                render={<a href={`/admin/jobs`} />}
              >
                <ZapIcon className="size-3.5" />
                Open in Discover
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
