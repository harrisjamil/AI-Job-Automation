"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon, PlayIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type CrawlHealth = {
  scheduledCrawlEnabled: boolean
  crawlIntervalHours: number
  lastScheduledAt: string | null
  lastAlertedAt: string | null
  lastCrawlError: string | null
  lastCrawlFailedAt: string | null
  nextScheduledAt: string | null
  cronHint: string
  lastRun: {
    id: string
    status: string
    jobsFound: number
    startedAt: string
    finishedAt: string | null
    error: string | null
  } | null
  recentRuns: Array<{
    id: string
    status: string
    jobsFound: number
    startedAt: string
    error: string | null
  }>
}

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
  imapHost: string
  imapPort: string
  imapUser: string
  imapPass: string
  imapSecure: boolean
  replySyncEnabled: boolean
  lastReplySyncAt: string | null
  remoteOnly: boolean
  scheduledCrawlEnabled: boolean
  crawlIntervalHours: string
  targetRolesPreview: string
  includeKeywordsPreview: string
  excludeKeywordsPreview: string
  alertsEnabled: boolean
  alertMinScore: string
  followUpRemindersEnabled: boolean
  autoApplyEnabled: boolean
  autoApplyMinScore: string
  autoApplyMarkApplied: boolean
  autoApplyFollowUpDays: string
  slackWebhookUrl: string
  inAppAlertsEnabled: boolean
  interviewRemindersEnabled: boolean
  hasApiKey: boolean
  hasSmtpPass: boolean
  hasImapPass: boolean
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
  imapHost: "",
  imapPort: "993",
  imapUser: "",
  imapPass: "",
  imapSecure: true,
  replySyncEnabled: false,
  lastReplySyncAt: null,
  remoteOnly: true,
  scheduledCrawlEnabled: false,
  crawlIntervalHours: "6",
  targetRolesPreview: "",
  includeKeywordsPreview: "",
  excludeKeywordsPreview: "",
  alertsEnabled: true,
  alertMinScore: "55",
  followUpRemindersEnabled: true,
  autoApplyEnabled: false,
  autoApplyMinScore: "70",
  autoApplyMarkApplied: true,
  autoApplyFollowUpDays: "7",
  slackWebhookUrl: "",
  inAppAlertsEnabled: true,
  interviewRemindersEnabled: true,
  hasApiKey: false,
  hasSmtpPass: false,
  hasImapPass: false,
  apiKeyMasked: null,
}

function formatWhen(value: string | null | undefined) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function EmailSettingsForm() {
  const [form, setForm] = useState<SettingsState>(initialState)
  const [health, setHealth] = useState<CrawlHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [runningCrawl, setRunningCrawl] = useState(false)
  const [syncingReplies, setSyncingReplies] = useState(false)
  const [envHints, setEnvHints] = useState({
    hasResendEnv: false,
    hasSmtpEnv: false,
    hasAdzunaEnv: false,
    hasCronSecret: false,
  })

  function update<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

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
      setHealth(data.crawlHealth ?? null)
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
        imapHost: account?.imapHost ?? "",
        imapPort: String(account?.imapPort ?? 993),
        imapUser: account?.imapUser ?? "",
        imapPass: "",
        imapSecure: account?.imapSecure ?? true,
        replySyncEnabled: account?.replySyncEnabled ?? false,
        lastReplySyncAt: account?.lastReplySyncAt ?? null,
        remoteOnly: crawl?.remoteOnly ?? true,
        scheduledCrawlEnabled: crawl?.scheduledCrawlEnabled ?? false,
        crawlIntervalHours: String(crawl?.crawlIntervalHours ?? 6),
        targetRolesPreview: (crawl?.targetRoles ?? []).join(", "),
        includeKeywordsPreview: (crawl?.includeKeywords ?? []).join(", "),
        excludeKeywordsPreview: (crawl?.excludeKeywords ?? []).join(", "),
        alertsEnabled: crawl?.alertsEnabled ?? true,
        alertMinScore: String(crawl?.alertMinScore ?? 55),
        followUpRemindersEnabled: crawl?.followUpRemindersEnabled ?? true,
        autoApplyEnabled: crawl?.autoApplyEnabled ?? false,
        autoApplyMinScore: String(crawl?.autoApplyMinScore ?? 70),
        autoApplyMarkApplied: crawl?.autoApplyMarkApplied ?? true,
        autoApplyFollowUpDays: String(crawl?.autoApplyFollowUpDays ?? 7),
        slackWebhookUrl: crawl?.slackWebhookUrl ?? "",
        inAppAlertsEnabled: crawl?.inAppAlertsEnabled ?? true,
        interviewRemindersEnabled: crawl?.interviewRemindersEnabled ?? true,
        hasApiKey: Boolean(account?.hasApiKey),
        hasSmtpPass: Boolean(account?.hasSmtpPass),
        hasImapPass: Boolean(account?.hasImapPass),
        apiKeyMasked: account?.apiKeyMasked ?? null,
      })
    } catch {
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

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
            apiKey: form.apiKey || undefined,
            smtpHost: form.smtpHost,
            smtpPort: form.smtpPort,
            smtpUser: form.smtpUser,
            smtpPass: form.smtpPass || undefined,
            smtpSecure: form.smtpSecure,
            imapHost: form.imapHost,
            imapPort: form.imapPort,
            imapUser: form.imapUser,
            imapPass: form.imapPass || undefined,
            imapSecure: form.imapSecure,
            replySyncEnabled: form.replySyncEnabled,
          },
          crawlDefaults: {
            remoteOnly: form.remoteOnly,
            scheduledCrawlEnabled: form.scheduledCrawlEnabled,
            crawlIntervalHours: Number(form.crawlIntervalHours) || 6,
            alertsEnabled: form.alertsEnabled,
            alertMinScore: Number(form.alertMinScore) || 55,
            followUpRemindersEnabled: form.followUpRemindersEnabled,
            autoApplyEnabled: form.autoApplyEnabled,
            autoApplyMinScore: Number(form.autoApplyMinScore) || 70,
            autoApplyMarkApplied: form.autoApplyMarkApplied,
            autoApplyFollowUpDays: Number(form.autoApplyFollowUpDays) || 7,
            slackWebhookUrl: form.slackWebhookUrl,
            inAppAlertsEnabled: form.inAppAlertsEnabled,
            interviewRemindersEnabled: form.interviewRemindersEnabled,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to save")
        return
      }
      toast.success("Settings saved")
      setHealth(data.crawlHealth ?? health)
      setLoading(true)
      await load()
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleTestEmail() {
    setTesting(true)
    try {
      const response = await fetch("/api/settings/test-email", { method: "POST" })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Test email failed")
        return
      }
      toast.success("Test email sent — check your inbox")
    } catch {
      toast.error("Test email failed")
    } finally {
      setTesting(false)
    }
  }

  async function handleRunCrawl() {
    setRunningCrawl(true)
    try {
      const response = await fetch("/api/settings/crawl-run-now", {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Crawl failed")
        await load()
        return
      }
      toast.success(
        `Crawl finished — ${data.crawlRun?.jobsFound ?? 0} jobs found`
      )
      await load()
    } catch {
      toast.error("Crawl failed")
    } finally {
      setRunningCrawl(false)
    }
  }

  async function handleReplySync() {
    setSyncingReplies(true)
    try {
      const response = await fetch("/api/settings/reply-sync", {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Reply sync failed")
        return
      }
      toast.success(
        `Scanned ${data.scanned ?? 0} · updated ${data.updated ?? 0} replies`
      )
      await load()
    } catch {
      toast.error("Reply sync failed")
    } finally {
      setSyncingReplies(false)
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
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="email">
        <TabsList variant="line" className="w-full max-w-full flex-wrap h-auto">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="crawl">Crawl</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="auto-apply">Auto-apply</TabsTrigger>
          <TabsTrigger value="replies">Reply sync</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4 space-y-4 rounded-xl border p-5">
          <div>
            <h3 className="text-lg font-medium">Email sending</h3>
            <p className="text-sm text-muted-foreground">
              Connect Resend (recommended) or SMTP so you can send outreach from
              the app.
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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleTestEmail()}
              disabled={testing}
            >
              {testing ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : null}
              Send test email
            </Button>
            <p className="text-xs text-muted-foreground">
              Env: Resend {envHints.hasResendEnv ? "yes" : "no"} · SMTP{" "}
              {envHints.hasSmtpEnv ? "yes" : "no"} · Adzuna{" "}
              {envHints.hasAdzunaEnv ? "yes" : "no"} · CRON_SECRET{" "}
              {envHints.hasCronSecret ? "yes" : "no"}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="crawl" className="mt-4 space-y-4 rounded-xl border p-5">
          <div>
            <h3 className="text-lg font-medium">Crawl & schedule</h3>
            <p className="text-sm text-muted-foreground">
              Roles and include/exclude keywords are edited on{" "}
              <Link href="/admin/profile" className="underline underline-offset-2">
                My Profile
              </Link>{" "}
              (single source of truth).
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Target roles: </span>
              {form.targetRolesPreview || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Include: </span>
              {form.includeKeywordsPreview || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Exclude: </span>
              {form.excludeKeywordsPreview || "—"}
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
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-medium">Crawl health</h4>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleRunCrawl()}
                disabled={runningCrawl}
              >
                {runningCrawl ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <PlayIcon className="size-3.5" />
                )}
                Run crawl now
              </Button>
            </div>
            <dl className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Last run</dt>
                <dd>
                  {health?.lastRun
                    ? `${health.lastRun.status} · ${health.lastRun.jobsFound} jobs · ${formatWhen(health.lastRun.startedAt)}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Next scheduled</dt>
                <dd>{formatWhen(health?.nextScheduledAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last alert</dt>
                <dd>{formatWhen(health?.lastAlertedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last failure</dt>
                <dd className={health?.lastCrawlError ? "text-destructive" : ""}>
                  {health?.lastCrawlError
                    ? `${health.lastCrawlError} (${formatWhen(health.lastCrawlFailedAt)})`
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              {health?.cronHint}{" "}
              {!envHints.hasCronSecret
                ? "Set CRON_SECRET in .env for production."
                : null}
            </p>
            {health?.recentRuns?.length ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {health.recentRuns.map((run) => (
                  <li key={run.id}>
                    {formatWhen(run.startedAt)} — {run.status} (
                    {run.jobsFound} jobs)
                    {run.error ? ` · ${run.error}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-6 rounded-xl border p-5">
          <div>
            <h3 className="text-lg font-medium">High-score job alerts</h3>
            <p className="text-sm text-muted-foreground">
              After each crawl, notify yourself about new jobs at or above your
              score threshold.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.alertsEnabled}
              onCheckedChange={(checked) => update("alertsEnabled", checked)}
              id="alertsEnabled"
            />
            <Label htmlFor="alertsEnabled">Alert on strong matches</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alertMinScore">Minimum match score</Label>
            <Input
              id="alertMinScore"
              type="number"
              min={28}
              max={100}
              value={form.alertMinScore}
              onChange={(event) => update("alertMinScore", event.target.value)}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium">Channels</h4>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.inAppAlertsEnabled}
                onCheckedChange={(checked) =>
                  update("inAppAlertsEnabled", checked)
                }
                id="inAppAlertsEnabled"
              />
              <Label htmlFor="inAppAlertsEnabled">
                In-app notifications (header bell)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slackWebhookUrl">Slack webhook URL (optional)</Label>
              <Input
                id="slackWebhookUrl"
                value={form.slackWebhookUrl}
                onChange={(event) =>
                  update("slackWebhookUrl", event.target.value)
                }
                placeholder="https://hooks.slack.com/services/…"
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium">Follow-up reminders</h4>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.followUpRemindersEnabled}
                onCheckedChange={(checked) =>
                  update("followUpRemindersEnabled", checked)
                }
                id="followUpRemindersEnabled"
              />
              <Label htmlFor="followUpRemindersEnabled">
                Email me about due follow-ups
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.interviewRemindersEnabled}
                onCheckedChange={(checked) =>
                  update("interviewRemindersEnabled", checked)
                }
                id="interviewRemindersEnabled"
              />
              <Label htmlFor="interviewRemindersEnabled">
                Remind me about upcoming interviews
              </Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="auto-apply" className="mt-4 space-y-4 rounded-xl border p-5">
          <div>
            <h3 className="text-lg font-medium">Auto-apply</h3>
            <p className="text-sm text-muted-foreground">
              Prepare cover letters and tailored resumes for strong matches,
              answer common ATS questions, and use the Chrome extension to fill
              forms (including resume PDF assist).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.autoApplyEnabled}
              onCheckedChange={(checked) => update("autoApplyEnabled", checked)}
              id="autoApplyEnabled"
            />
            <Label htmlFor="autoApplyEnabled">
              After crawls, auto-prepare top matches
            </Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="autoApplyMinScore">Minimum match score</Label>
              <Input
                id="autoApplyMinScore"
                type="number"
                min={40}
                max={100}
                value={form.autoApplyMinScore}
                onChange={(event) =>
                  update("autoApplyMinScore", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="autoApplyFollowUpDays">Follow-up in (days)</Label>
              <Input
                id="autoApplyFollowUpDays"
                type="number"
                min={0}
                max={60}
                value={form.autoApplyFollowUpDays}
                onChange={(event) =>
                  update("autoApplyFollowUpDays", event.target.value)
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.autoApplyMarkApplied}
              onCheckedChange={(checked) =>
                update("autoApplyMarkApplied", checked)
              }
              id="autoApplyMarkApplied"
            />
            <Label htmlFor="autoApplyMarkApplied">
              Mark as Applied when materials are ready
            </Label>
          </div>
        </TabsContent>

        <TabsContent value="replies" className="mt-4 space-y-4 rounded-xl border p-5">
          <div>
            <h3 className="text-lg font-medium">IMAP reply sync</h3>
            <p className="text-sm text-muted-foreground">
              Connect IMAP to auto-detect recruiter replies and update
              Applications reply status. Cron runs every 2 hours when enabled.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.replySyncEnabled}
              onCheckedChange={(checked) =>
                update("replySyncEnabled", checked)
              }
              id="replySyncEnabled"
            />
            <Label htmlFor="replySyncEnabled">Enable reply sync</Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="imapHost">IMAP host</Label>
              <Input
                id="imapHost"
                value={form.imapHost}
                onChange={(event) => update("imapHost", event.target.value)}
                placeholder="imap.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imapPort">IMAP port</Label>
              <Input
                id="imapPort"
                value={form.imapPort}
                onChange={(event) => update("imapPort", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imapUser">IMAP user</Label>
              <Input
                id="imapUser"
                value={form.imapUser}
                onChange={(event) => update("imapUser", event.target.value)}
                placeholder="Usually your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imapPass">
                IMAP password / app password
                {form.hasImapPass ? " (saved)" : ""}
              </Label>
              <Input
                id="imapPass"
                type="password"
                value={form.imapPass}
                onChange={(event) => update("imapPass", event.target.value)}
                placeholder={
                  form.hasImapPass ? "Leave blank to keep existing" : ""
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.imapSecure}
              onCheckedChange={(checked) => update("imapSecure", checked)}
              id="imapSecure"
            />
            <Label htmlFor="imapSecure">Use TLS (recommended)</Label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleReplySync()}
              disabled={syncingReplies}
            >
              {syncingReplies ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-3.5" />
              )}
              Sync replies now
            </Button>
            <p className="text-xs text-muted-foreground">
              Last sync: {formatWhen(form.lastReplySyncAt)}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Save settings
        </Button>
      </div>
    </div>
  )
}
