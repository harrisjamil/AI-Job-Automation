import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.jobDocument.findFirst({
    where: { id, userId: user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    content?: string
  }

  const document = await prisma.jobDocument.update({
    where: { id: existing.id },
    data: {
      ...(typeof body.title === "string"
        ? { title: body.title.slice(0, 200) }
        : {}),
      ...(typeof body.content === "string"
        ? { content: body.content.slice(0, 12000) }
        : {}),
    },
  })

  return NextResponse.json({ document })
}
