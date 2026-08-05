import { AnalyticsPanel } from "@/components/admin/analytics-panel"

export default function AnalyticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Conversion, outreach reply rate, apply volume, and source quality.
        </p>
      </div>
      <AnalyticsPanel />
    </div>
  )
}
