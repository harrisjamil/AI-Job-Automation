"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SettingsState = {
  provider: string
  fromEmail: string
  fromName: string
  apiKey: string
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
  remoteOnly: boolean
  scheduledCrawlEnabled: boolean
  crawlIntervalHours: string
  excludeKeywords: string
  includeKeywords: string
  targetRoles: string
  hasApiKey: boolean
  hasSmtpPass: boolean
  apiKeyMasked: string | null
}

const initialState: SettingsState = {
  provider: "resend",
  fromEmail: "",
  fromName: "",
  apiKey: "",
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpSecure: true,
  remoteOnly: true,
  scheduledCrawlEnabled: false,
  crawlIntervalHours: "6",
  excludeKeywords: "",
  includeKeywords: "",
  targetRoles: "",
  hasApiKey: false,
  hasSmtpPass: false,
  apiKeyMasked: null,
}

export function EmailSettingsForm() {
  const [form, setForm] = useState<SettingsState>(initialState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [envHints, setEnvHints] = useState({
    hasResendEnv: false,
    hasSmtpEnv: false,
    hasAdzunaEnv: false,
  })

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/settings/email")
        const data = await response.json()
        if (!response.ok) {
          toast.error(data.error ?? "Failed to load settings")
          return
        }
        const account = data.emailAccount
        const crawl = data.crawlDefaults
        setEnvHints(data.envHints ?? {})
        setForm({
          provider: account?.provider ?? "resend",
          fromEmail: account?.fromEmail ?? "",
          fromName: account?.fromName ?? "",
          apiKey: "",
          smtpHost: account?.smtpHost ?? "",
          smtpPort: String(account?.smtpPort ?? 587),
          smtpUser: account?.smtpUser ?? "",
          smtpPass: "",
          smtpSecure: account?.smtpSecure ?? true,
          remoteOnly: crawl?.remoteOnly ?? true,
          scheduledCrawlEnabled: crawl?.scheduledCrawlEnabled ?? false,
          crawlIntervalHours: String(crawl?.crawlIntervalHours ?? 6),
          excludeKeywords: (crawl?.excludeKeywords ?? []).join(", "),
          includeKeywords: (crawl?.includeKeywords ?? []).join(", "),
          targetRoles: (crawl?.targetRoles ?? []).join(", "),
          hasApiKey: Boolean(account?.hasApiKey),
          hasSmtpPass: Boolean(account?.hasSmtpPass),
          apiKeyMasked: account?.apiKeyMasked ?? null,
        })
      } catch {
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  function update<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function splitCsv(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailAccount: {
            provider: form.provider,
            fromEmail: form.fromEmail,
            fromName: form.fromName,
            ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
            smtpHost: form.smtpHost,
            smtpPort: form.smtpPort,
            smtpUser: form.smtpUser,
            ...(form.smtpPass.trim() ? { smtpPass: form.smtpPass.trim() } : {}),
            smtpSecure: form.smtpSecure,
            isActive: true,
          },
          crawlDefaults: {
            remoteOnly: form.remoteOnly,
            scheduledCrawlEnabled: form.scheduledCrawlEnabled,
            crawlIntervalHours: Number(form.crawlIntervalHours) || 6,
            excludeKeywords: splitCsv(form.excludeKeywords),
            includeKeywords: splitCsv(form.includeKeywords),
            targetRoles: splitCsv(form.targetRoles),
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to save settings")
        return
      }
      toast.success("Settings saved")
      setForm((prev) => ({
        ...prev,
        apiKey: "",
        smtpPass: "",
        hasApiKey: Boolean(data.emailAccount?.hasApiKey),
        hasSmtpPass: Boolean(data.emailAccount?.hasSmtpPass),
        apiKeyMasked: data.emailAccount?.apiKeyMasked ?? null,
      }))
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading settings…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-4 rounded-xl border p-5">
        <div>
          <h3 className="text-lg font-medium">Email sending</h3>
          <p className="text-sm text-muted-foreground">
            Connect Resend (recommended) or SMTP so you can send outreach from
            the app. You can also set RESEND_API_KEY in server env.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={form.provider}
              onValueChange={(value) => update("provider", value ?? "resend")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromEmail">From email</Label>
            <Input
              id="fromEmail"
              value={form.fromEmail}
              onChange={(event) => update("fromEmail", event.target.value)}
              placeholder="you@yourdomain.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromName">From name</Label>
            <Input
              id="fromName"
              value={form.fromName}
              onChange={(event) => update("fromName", event.target.value)}
              placeholder="Your name"
            />
          </div>
          {form.provider === "resend" ? (
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                Resend API key
                {form.hasApiKey && form.apiKeyMasked
                  ? ` (saved: ${form.apiKeyMasked})`
                  : ""}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={form.apiKey}
                onChange={(event) => update("apiKey", event.target.value)}
                placeholder={
                  form.hasApiKey || envHints.hasResendEnv
                    ? "Leave blank to keep existing"
                    : "re_..."
                }
              />
            </div>
          ) : null}
        </div>

        {form.provider === "smtp" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP host</Label>
              <Input
                id="smtpHost"
                value={form.smtpHost}
                onChange={(event) => update("smtpHost", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP port</Label>
              <Input
                id="smtpPort"
                value={form.smtpPort}
                onChange={(event) => update("smtpPort", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpUser">SMTP user</Label>
              <Input
                id="smtpUser"
                value={form.smtpUser}
                onChange={(event) => update("smtpUser", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPass">
                SMTP password
                {form.hasSmtpPass ? " (saved)" : ""}
              </Label>
              <Input
                id="smtpPass"
                type="password"
                value={form.smtpPass}
                onChange={(event) => update("smtpPass", event.target.value)}
                placeholder={
                  form.hasSmtpPass ? "Leave blank to keep existing" : ""
                }
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={form.smtpSecure}
                onCheckedChange={(checked) => update("smtpSecure", checked)}
                id="smtpSecure"
              />
              <Label htmlFor="smtpSecure">Use TLS / secure</Label>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Env detected: Resend {envHints.hasResendEnv ? "yes" : "no"} · SMTP{" "}
          {envHints.hasSmtpEnv ? "yes" : "no"} · Adzuna{" "}
          {envHints.hasAdzunaEnv ? "yes" : "no"}
          {!envHints.hasAdzunaEnv
            ? " — add ADZUNA_APP_ID + ADZUNA_APP_KEY to .env for Adzuna (optional; ATS + remote boards already run without it)"
            : ""}
        </p>
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <div>
          <h3 className="text-lg font-medium">Crawl defaults</h3>
          <p className="text-sm text-muted-foreground">
            Global search is worldwide by default. Countries are optional soft
            filters in Profile — not hard limits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.remoteOnly}
            onCheckedChange={(checked) => update("remoteOnly", checked)}
            id="remoteOnly"
          />
          <Label htmlFor="remoteOnly">Prefer remote / worldwide listings</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.scheduledCrawlEnabled}
            onCheckedChange={(checked) =>
              update("scheduledCrawlEnabled", checked)
            }
            id="scheduledCrawlEnabled"
          />
          <Label htmlFor="scheduledCrawlEnabled">
            Enable scheduled multi-source crawls
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="crawlIntervalHours">Crawl interval (hours)</Label>
          <Input
            id="crawlIntervalHours"
            type="number"
            min={1}
            max={168}
            value={form.crawlIntervalHours}
            onChange={(event) =>
              update("crawlIntervalHours", event.target.value)
            }
          />
          <p className="text-xs text-muted-foreground">
            Requires a cron hit to <code>/api/cron/crawl</code> with{" "}
            <code>CRON_SECRET</code>.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="includeKeywords">Include keywords</Label>
          <Textarea
            id="includeKeywords"
            value={form.includeKeywords}
            onChange={(event) => update("includeKeywords", event.target.value)}
            placeholder="TypeScript, Next.js, AI engineer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excludeKeywords">Exclude keywords</Label>
          <Textarea
            id="excludeKeywords"
            value={form.excludeKeywords}
            onChange={(event) => update("excludeKeywords", event.target.value)}
            placeholder="WordPress, unpaid, internship"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetRoles">Target roles (comma-separated, multi)</Label>
          <Textarea
            id="targetRoles"
            value={form.targetRoles}
            onChange={(event) => update("targetRoles", event.target.value)}
            placeholder="Full Stack Developer, AI Engineer, Backend Developer"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Save settings
        </Button>
      </div>
    </div>
  )
}
