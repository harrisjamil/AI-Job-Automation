import { AiPlatformsManager } from "@/components/admin/ai-platforms-manager"

export default function AiPlatformsPage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">AI Platforms</h2>
        <p className="text-muted-foreground">
          Connect Google Gemini and Hugging Face models, save credentials, and
          verify them with a live test.
        </p>
      </div>
      <AiPlatformsManager />
    </div>
  )
}
