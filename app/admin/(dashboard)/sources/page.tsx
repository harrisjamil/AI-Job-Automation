import { SourcesOverviewPanel } from "@/components/admin/sources-overview-panel"

export default function SourcesPage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Job Sources</h2>
        <p className="text-muted-foreground">
          Multi-source aggregation across ATS platforms, remote boards, company
          careers, startup boards, and AI job listings — with normalization and
          cross-source duplicate detection.
        </p>
      </div>
      <SourcesOverviewPanel />
    </div>
  )
}
