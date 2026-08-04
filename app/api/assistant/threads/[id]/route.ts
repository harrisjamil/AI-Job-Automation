import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const thread = await prisma.assistantThread.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  })

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 })
  }

  return NextResponse.json({ thread })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.assistantThread.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 })
  }

  await prisma.assistantThread.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
