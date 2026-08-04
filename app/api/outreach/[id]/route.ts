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
  const body = (await request.json().catch(() => ({}))) as {
    toEmail?: string
    subject?: string
    body?: string
  }

  const existing = await prisma.outreachEmail.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Outreach not found" }, { status: 404 })
  }

  if (existing.status === "sent") {
    return NextResponse.json(
      { error: "Sent emails cannot be edited" },
      { status: 400 }
    )
  }

  const email = await prisma.outreachEmail.update({
    where: { id },
    data: {
      ...(body.toEmail ? { toEmail: body.toEmail.trim().toLowerCase() } : {}),
      ...(body.subject ? { subject: body.subject.slice(0, 200) } : {}),
      ...(body.body ? { body: body.body.slice(0, 5000) } : {}),
    },
  })

  return NextResponse.json({ email })
}
