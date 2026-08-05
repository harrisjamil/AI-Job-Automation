import { NextResponse } from "next/server"
import {
  createExtensionToken,
  revokeExtensionToken,
} from "@/lib/extension/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tokens = await prisma.extensionToken.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      tokenPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ tokens })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { label?: string }
  const { token, record } = await createExtensionToken({
    userId: user.id,
    label: body.label,
  })

  return NextResponse.json({
    token,
    record: {
      id: record.id,
      label: record.label,
      tokenPrefix: record.tokenPrefix,
      createdAt: record.createdAt,
    },
    warning: "Copy this token now — it will not be shown again.",
  })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string }
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  await revokeExtensionToken(user.id, body.id)
  return NextResponse.json({ ok: true })
}
