"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2Icon,
  FlaskConicalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { AI_PROVIDERS, type AiProviderValue } from "@/lib/ai-platforms"
import { cn } from "@/lib/utils"

type Platform = {
  id: string
  provider: AiProviderValue | string
  name: string
  apiKeyMasked: string
  hasApiKey: boolean
  modelId: string
  baseUrl: string | null
  isActive: boolean
  lastTestedAt: string | null
  lastTestStatus: string | null
  lastTestMessage: string | null
  createdAt: string
  updatedAt: string
}

type FormState = {
  provider: AiProviderValue
  name: string
  apiKey: string
  modelId: string
  baseUrl: string
  isActive: boolean
}

const emptyForm = (): FormState => ({
  provider: "gemini",
  name: "",
  apiKey: "",
  modelId: AI_PROVIDERS[0].models[0],
  baseUrl: AI_PROVIDERS[0].defaultBaseUrl,
  isActive: true,
})

function providerLabel(provider: string) {
  return (
    AI_PROVIDERS.find((item) => item.value === provider)?.label ?? provider
  )
}

function formatDate(value: string | null) {
  if (!value) return "Never"
  return new Date(value).toLocaleString()
}

export function AiPlatformsManager() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  const selectedProvider = useMemo(
    () => AI_PROVIDERS.find((item) => item.value === form.provider),
    [form.provider],
  )

  async function loadPlatforms() {
    try {
      const response = await fetch("/api/ai-platforms")
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load AI platforms.")
        return
      }
      setPlatforms(data.platforms ?? [])
    } catch {
      toast.error("Failed to load AI platforms.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPlatforms()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(platform: Platform) {
    const meta = AI_PROVIDERS.find((item) => item.value === platform.provider)
    setEditingId(platform.id)
    setForm({
      provider: (platform.provider as AiProviderValue) || "gemini",
      name: platform.name,
      apiKey: "",
      modelId: platform.modelId,
      baseUrl: platform.baseUrl || meta?.defaultBaseUrl || "",
      isActive: platform.isActive,
    })
    setShowForm(true)
  }

  function updateProvider(provider: AiProviderValue) {
    const meta = AI_PROVIDERS.find((item) => item.value === provider)
    setForm((prev) => ({
      ...prev,
      provider,
      modelId: meta?.models[0] ?? "",
      baseUrl: meta?.defaultBaseUrl ?? "",
    }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.modelId.trim()) {
      toast.error("Name and model are required.")
      return
    }

    if (!editingId && !form.apiKey.trim()) {
      toast.error("API key is required.")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        editingId ? `/api/ai-platforms/${editingId}` : "/api/ai-platforms",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: form.provider,
            name: form.name,
            apiKey: form.apiKey,
            modelId: form.modelId,
            baseUrl: form.baseUrl,
            isActive: form.isActive,
          }),
        },
      )
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Failed to save platform.")
        return
      }

      toast.success(editingId ? "Platform updated." : "Platform added.")
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm())
      await loadPlatforms()
    } catch {
      toast.error("Failed to save platform.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/ai-platforms/${id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to delete platform.")
        return
      }
      toast.success("Platform deleted.")
      if (editingId === id) {
        setShowForm(false)
        setEditingId(null)
      }
      await loadPlatforms()
    } catch {
      toast.error("Failed to delete platform.")
    }
  }

  async function handleTest(id: string) {
    setTestingId(id)
    try {
      const response = await fetch(`/api/ai-platforms/${id}/test`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.ok) {
        toast.success(data.message, {
          description: data.output,
        })
      } else {
        toast.error(data.message ?? "Connection test failed.")
      }

      setPlatforms((prev) =>
        prev.map((platform) =>
          platform.id === id && data.platform
            ? {
                ...platform,
                lastTestedAt: data.platform.lastTestedAt,
                lastTestStatus: data.platform.lastTestStatus,
                lastTestMessage: data.platform.lastTestMessage,
              }
            : platform,
        ),
      )
    } catch {
      toast.error("Connection test failed.")
    } finally {
      setTestingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            Connected providers
          </h3>
          <p className="text-sm text-muted-foreground">
            Add Gemini or Hugging Face credentials, then test the connection.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Add platform
        </Button>
      </div>

      {showForm ? (
        <section className="rounded-xl border bg-card p-5 md:p-6">
          <div className="mb-5">
            <h4 className="font-medium">
              {editingId ? "Edit platform" : "New platform"}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              API keys are stored securely in your database and masked in the
              UI.
            </p>
          </div>

          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Provider</FieldLabel>
              <Select
                value={form.provider}
                onValueChange={(value) =>
                  updateProvider((value as AiProviderValue) || "gemini")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="platform-name">Display name</FieldLabel>
              <Input
                id="platform-name"
                placeholder="Production Gemini"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="platform-model">Model</FieldLabel>
              <Input
                id="platform-model"
                list={`models-${form.provider}`}
                placeholder="Select or type a model id"
                value={form.modelId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, modelId: event.target.value }))
                }
              />
              <datalist id={`models-${form.provider}`}>
                {selectedProvider?.models.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              <FieldDescription>
                Suggested models appear as you type. Custom model IDs are
                allowed.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="platform-api-key">API key</FieldLabel>
              <Input
                id="platform-api-key"
                type="password"
                autoComplete="off"
                placeholder={
                  editingId
                    ? "Leave blank to keep current key"
                    : "Paste API key"
                }
                value={form.apiKey}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, apiKey: event.target.value }))
                }
              />
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="platform-base-url">Base URL</FieldLabel>
              <Input
                id="platform-base-url"
                value={form.baseUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, baseUrl: event.target.value }))
                }
              />
              <FieldDescription>
                Defaults are set for each provider and can be overridden.
              </FieldDescription>
            </Field>

            <Field orientation="horizontal" className="items-center">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <FieldLabel>Active for AI features</FieldLabel>
            </Field>
          </FieldGroup>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Saving...
                </>
              ) : editingId ? (
                "Update platform"
              ) : (
                "Save platform"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {platforms.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No AI platforms yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add Google Gemini or a Hugging Face model to start testing.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {platforms.map((platform) => (
            <article
              key={platform.id}
              className="rounded-xl border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold tracking-tight">
                      {platform.name}
                    </h4>
                    <Badge variant="outline">
                      {providerLabel(platform.provider)}
                    </Badge>
                    <Badge
                      variant={platform.isActive ? "default" : "secondary"}
                    >
                      {platform.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {platform.lastTestStatus === "success" ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2Icon className="size-3" />
                        Tested
                      </Badge>
                    ) : null}
                    {platform.lastTestStatus === "failed" ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircleIcon className="size-3" />
                        Failed
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Model:{" "}
                    <span className="text-foreground">{platform.modelId}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    API key:{" "}
                    <span className="font-mono text-foreground">
                      {platform.apiKeyMasked}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last tested: {formatDate(platform.lastTestedAt)}
                  </p>
                  {platform.lastTestMessage ? (
                    <p
                      className={cn(
                        "max-w-2xl text-sm",
                        platform.lastTestStatus === "success"
                          ? "text-muted-foreground"
                          : "text-destructive",
                      )}
                    >
                      {platform.lastTestMessage}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingId === platform.id}
                    onClick={() => void handleTest(platform.id)}
                  >
                    {testingId === platform.id ? (
                      <>
                        <Spinner data-icon="inline-start" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <FlaskConicalIcon className="size-4" />
                        Test
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(platform)}
                  >
                    <PencilIcon className="size-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(platform.id)}
                  >
                    <Trash2Icon className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
