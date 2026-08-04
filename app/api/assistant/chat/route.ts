import { NextResponse } from "next/server"
import {
  generateAssistantReply,
  titleFromMessage,
} from "@/lib/assistant/chat"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 60

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    threadId?: string
    message?: string
  }

  const message = (body.message ?? "").trim()
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  let thread =
    body.threadId
      ? await prisma.assistantThread.findFirst({
          where: { id: body.threadId, userId: user.id },
        })
      : null

  if (body.threadId && !thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 })
  }

  if (!thread) {
    thread = await prisma.assistantThread.create({
      data: {
        userId: user.id,
        title: titleFromMessage(message),
      },
    })
  }

  const history = await prisma.assistantMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 12,
    select: { role: true, content: true },
  })

  await prisma.assistantMessage.create({
    data: {
      threadId: thread.id,
      role: "user",
      content: message.slice(0, 8000),
    },
  })

  const reply = await generateAssistantReply({
    userId: user.id,
    history,
    message,
  })

  const assistantMessage = await prisma.assistantMessage.create({
    data: {
      threadId: thread.id,
      role: "assistant",
      content: reply,
    },
  })

  const shouldRetitle =
    thread.title === "New chat" || history.length === 0

  const updatedThread = await prisma.assistantThread.update({
    where: { id: thread.id },
    data: {
      updatedAt: new Date(),
      ...(shouldRetitle ? { title: titleFromMessage(message) } : {}),
    },
  })

  return NextResponse.json({
    thread: updatedThread,
    message: assistantMessage,
    reply,
  })
}
