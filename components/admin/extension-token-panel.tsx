"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CopyIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type TokenRow = {
  id: string
  label: string
  tokenPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

export function ExtensionTokenPanel() {
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState("Chrome extension")
  const [freshToken, setFreshToken] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const response = await fetch("/api/extension/token")
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load tokens")
        return
      }
      setTokens(data.tokens ?? [])
    } catch {
      toast.error("Failed to load tokens")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate() {
    setCreating(true)
    try {
      const response = await fetch("/api/extension/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to create token")
        return
      }
      setFreshToken(data.token)
      toast.success("Token created — copy it now")
      await load()
    } catch {
      toast.error("Failed to create token")
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    const response = await fetch("/api/extension/token", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const data = await response.json()
    if (!response.ok) {
      toast.error(data.error ?? "Failed to revoke")
      return
    }
    toast.success("Token revoked")
    await load()
  }

  return (
    <section className="space-y-4 rounded-xl border p-5">
      <div>
        <h3 className="text-lg font-medium">Form-fill extension</h3>
        <p className="text-sm text-muted-foreground">
          Load the unpacked Chrome extension from the{" "}
          <code className="text-xs">extension/</code> folder, create a token
          here, then fill Greenhouse/Lever/Ashby forms from your auto-apply
          package.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="ext-label">Label</Label>
          <Input
            id="ext-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
        <Button disabled={creating} onClick={() => void handleCreate()}>
          {creating ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Create token
        </Button>
      </div>

      {freshToken ? (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-medium">Copy this token now</p>
          <code className="block break-all text-xs">{freshToken}</code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(freshToken)
              toast.success("Token copied")
            }}
          >
            <CopyIcon className="size-3.5" />
            Copy token
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" />
          Loading tokens…
        </p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active tokens yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{token.label}</p>
                <p className="text-xs text-muted-foreground">
                  {token.tokenPrefix}
                  {token.lastUsedAt
                    ? ` · last used ${new Date(token.lastUsedAt).toLocaleString()}`
                    : " · never used"}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => void handleRevoke(token.id)}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
