import { AssistantChatPanel } from "@/components/admin/assistant-chat-panel"

export default function AssistantPage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Assistant</h2>
        <p className="text-muted-foreground">
          Chat about your profile, matched jobs, outreach, and follow-ups —
          powered by your connected AI platform.
        </p>
      </div>
      <AssistantChatPanel />
    </div>
  )
}
