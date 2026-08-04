"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Loader2Icon,
  MessageSquarePlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type ThreadSummary = {
  id: string
  title: string
  updatedAt: string
  _count?: { messages: number }
}

type ChatMessage = {
  id: string
  role: string
  content: string
  createdAt: string
}

export function AssistantChatPanel() {
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadThreads()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  async function loadThreads() {
    setLoadingThreads(true)
    try {
      const response = await fetch("/api/assistant/threads")
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load chats")
        return
      }
      const next = (data.threads ?? []) as ThreadSummary[]
      setThreads(next)
      if (!activeThreadId && next[0]) {
        setActiveThreadId(next[0].id)
        void loadThread(next[0].id)
      }
    } catch {
      toast.error("Failed to load chats")
    } finally {
      setLoadingThreads(false)
    }
  }

  async function loadThread(id: string) {
    setLoadingMessages(true)
    setActiveThreadId(id)
    try {
      const response = await fetch(`/api/assistant/threads/${id}`)
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load conversation")
        return
      }
      setMessages((data.thread?.messages ?? []) as ChatMessage[])
    } catch {
      toast.error("Failed to load conversation")
    } finally {
      setLoadingMessages(false)
    }
  }

  async function handleNewChat() {
    setActiveThreadId(null)
    setMessages([])
    setInput("")
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/assistant/threads/${id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to delete")
        return
      }
      setThreads((prev) => prev.filter((t) => t.id !== id))
      if (activeThreadId === id) {
        setActiveThreadId(null)
        setMessages([])
      }
      toast.success("Chat deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  async function handleSend() {
    const message = input.trim()
    if (!message || sending) return

    setSending(true)
    setInput("")
    const optimisticId = `temp-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      },
    ])

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThreadId,
          message,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to send")
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        setInput(message)
        return
      }

      const thread = data.thread as ThreadSummary
      const assistantMessage = data.message as ChatMessage

      setActiveThreadId(thread.id)
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== optimisticId)
        return [
          ...withoutTemp,
          {
            id: `local-user-${Date.now()}`,
            role: "user",
            content: message,
            createdAt: new Date().toISOString(),
          },
          assistantMessage,
        ]
      })

      setThreads((prev) => {
        const others = prev.filter((t) => t.id !== thread.id)
        return [
          {
            id: thread.id,
            title: thread.title,
            updatedAt: thread.updatedAt,
          },
          ...others,
        ]
      })
    } catch {
      toast.error("Failed to send")
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setInput(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid min-h-[32rem] gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-3 rounded-xl border p-3">
        <Button
          size="sm"
          variant="secondary"
          className="w-full justify-start"
          onClick={() => void handleNewChat()}
        >
          <MessageSquarePlusIcon className="size-3.5" />
          New chat
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {loadingThreads ? (
            <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
              Loading…
            </p>
          ) : threads.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No chats yet. Ask about jobs, outreach, or your profile.
            </p>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className={`group flex items-center gap-1 rounded-lg ${
                  activeThreadId === thread.id ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm"
                  onClick={() => void loadThread(thread.id)}
                >
                  {thread.title}
                </button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => void handleDelete(thread.id)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="flex min-h-[32rem] flex-col rounded-xl border">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loadingMessages ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading conversation…
            </p>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 text-center">
              <p className="font-medium">Job search assistant</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Ask how to improve outreach, which roles match your skills, or
                how to follow up on applications. Uses your active AI platform
                and profile context.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          {sending ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2Icon className="size-3.5 animate-spin" />
                Thinking…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about jobs, cover letters, outreach…"
              className="min-h-[2.75rem] resize-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              disabled={sending || !input.trim()}
              onClick={() => void handleSend()}
            >
              {sending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
