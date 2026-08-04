"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Building2Icon, Loader2Icon, RadarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type SourceInfo = {
  key: string
  name: string
  category: string
  priority: number
  enabled: boolean
  crawlMethod: string
  description: string
}

type CategoryGroup = {
  category: string
  count: number
  sources: SourceInfo[]
}

type CompanyCount = { atsType: string | null; count: number }

const CATEGORY_LABELS: Record<string, string> = {
  ats: "ATS Providers",
  remote_board: "Remote Job Boards",
  company_careers: "Company & Startup Boards",
  startup_board: "Startup Job Boards",
  ai_ml: "AI & ML Boards",
  general: "General Aggregators",
  freelance: "Freelance Platforms",
}

export function SourcesOverviewPanel() {
  const [loading, setLoading] = useState(true)
  const [byCategory, setByCategory] = useState<CategoryGroup[]>([])
  const [companyCounts, setCompanyCounts] = useState<CompanyCount[]>([])
  const [totals, setTotals] = useState({ sources: 0, companies: 0 })
  const [dbSources, setDbSources] = useState<
    Array<{
      key: string
      lastStatus: string | null
      jobsFound: number
      lastCrawlAt: string | null
      lastError: string | null
    }>
  >([])

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/sources")
        const data = await response.json()
        if (!response.ok) {
          toast.error(data.error ?? "Failed to load sources")
          return
        }
        setByCategory(data.byCategory ?? [])
        setCompanyCounts(data.companyCounts ?? [])
        setTotals(data.totals ?? { sources: 0, companies: 0 })
        setDbSources(data.dbSources ?? [])
      } catch {
        toast.error("Failed to load sources")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading source registry…
      </div>
    )
  }

  const health = new Map(dbSources.map((s) => [s.key, s]))

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RadarIcon className="size-4" />
            Active sources
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {totals.sources}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2Icon className="size-4" />
            ATS company boards
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {totals.companies}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Pipeline</div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Scheduler → ATS / Remote / Company crawlers → Normalization →
            Cross-source dedupe → AI skill matching → PostgreSQL
          </p>
        </div>
      </div>

      {companyCounts.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Company directory by ATS</h3>
          <div className="flex flex-wrap gap-2">
            {companyCounts.map((row) => (
              <Badge key={String(row.atsType)} variant="secondary">
                {row.atsType ?? "unknown"}: {row.count}
              </Badge>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Run <code>npm run db:seed</code> to populate the ATS company
          directory.
        </p>
      )}

      <div className="space-y-6">
        {byCategory.map((group) => (
          <section key={group.category} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-lg font-medium">
                {CATEGORY_LABELS[group.category] ?? group.category}
              </h3>
              <span className="text-xs text-muted-foreground">
                {group.count} source{group.count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="divide-y rounded-xl border">
              {group.sources.map((source) => {
                const status = health.get(source.key)
                return (
                  <div
                    key={source.key}
                    className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{source.name}</span>
                        <Badge variant="outline">{source.crawlMethod}</Badge>
                        <Badge variant="secondary">P{source.priority}</Badge>
                        {!source.enabled ? (
                          <Badge variant="destructive">disabled</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {source.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                      {status?.lastStatus ? (
                        <>
                          <div>
                            Last: {status.lastStatus}
                            {typeof status.jobsFound === "number"
                              ? ` · ${status.jobsFound} jobs`
                              : ""}
                          </div>
                          {status.lastCrawlAt ? (
                            <div>
                              {new Date(status.lastCrawlAt).toLocaleString()}
                            </div>
                          ) : null}
                          {status.lastError ? (
                            <div className="max-w-xs text-destructive">
                              {status.lastError.slice(0, 120)}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span>Not crawled yet</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
