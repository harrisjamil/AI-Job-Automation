import { ApplyQueuePanel } from "@/components/admin/apply-queue-panel"

export default function ApplyQueuePage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Apply queue</h2>
        <p className="text-muted-foreground">
          Packages ready to paste into employer forms — copy all, open posting,
          or use the Chrome form-fill extension.
        </p>
      </div>
      <ApplyQueuePanel />
    </div>
  )
}
