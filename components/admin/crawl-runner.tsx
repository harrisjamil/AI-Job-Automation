"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GlobeIcon, Loader2Icon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type CrawlRun = {
  id: string
  status: string
  jobsFound: number
  sources: string[]
  keywords: string[]
  error: string | null
}

export function CrawlRunner({
  onCompleted,
}: {
  onCompleted?: (crawlRun: CrawlRun) => void
}) {
  const router = useRouter()
  const [running, setRunning] = useState(false)

  async function handleStart() {
    setRunning(true)
    try {
      const response = await fetch("/api/crawl/start", { method: "POST" })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Global search failed")
        return
      }

      const crawlRun = data.crawlRun as CrawlRun
      toast.success(
        `Found ${crawlRun.jobsFound} matching jobs from ${crawlRun.sources.join(", ") || "sources"}.`
      )

      if (crawlRun.error) {
        toast.warning(crawlRun.error)
      }

      if (crawlRun.jobsFound > 0) {
        toast.message("Finding emails on top matches…")
        try {
          const enrichResponse = await fetch("/api/jobs/enrich-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ limit: 10, minScore: 12 }),
          })
          const enrichData = await enrichResponse.json()
          if (enrichResponse.ok) {
            const results = (enrichData.results ?? []) as Array<{
              contacts: number
            }>
            const found = results.reduce(
              (sum, item) => sum + (item.contacts ?? 0),
              0
            )
            const checked = results.length
            if (found > 0) {
              toast.success(
                `Found ${found} contact email(s) across ${checked} job(s).`
              )
            } else {
              toast.message(
                checked > 0
                  ? `Checked ${checked} listing(s) — no public emails found (common for RemoteOK/Remotive apply forms).`
                  : "No jobs left to enrich."
              )
            }
          }
        } catch {
          toast.error("Email enrichment failed")
        }
      }

      onCompleted?.(crawlRun)
      router.refresh()
    } catch {
      toast.error("Global search failed")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => void handleStart()} disabled={running} size="lg">
        {running ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Searching & finding emails…
          </>
        ) : (
          <>
            <GlobeIcon className="size-4" />
            Run global search
          </>
        )}
      </Button>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <SparklesIcon className="size-3.5" />
        Searches ATS + remote boards, keeps only fresh listings (≤45 days) with
        strong role/skill fit, then extracts emails from top matches.
      </p>
    </div>
  )
}
