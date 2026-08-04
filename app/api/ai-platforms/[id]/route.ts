import { NextResponse } from "next/server"
import {
  getProviderMeta,
  isAiProvider,
  maskApiKey,
} from "@/lib/ai-platforms"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

type RouteContext = {
  params: Promise<{ id: string }>
}

function serializePlatform(platform: {
  id: string
  provider: string
  name: string
  apiKey: string
  modelId: string
  baseUrl: string | null
  isActive: boolean
  lastTestedAt: Date | null
  lastTestStatus: string | null
  lastTestMessage: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: platform.id,
    provider: platform.provider,
    name: platform.name,
    apiKeyMasked: maskApiKey(platform.apiKey),
    hasApiKey: Boolean(platform.apiKey),
    modelId: platform.modelId,
    baseUrl: platform.baseUrl,
    isActive: platform.isActive,
    lastTestedAt: platform.lastTestedAt,
    lastTestStatus: platform.lastTestStatus,
    lastTestMessage: platform.lastTestMessage,
    createdAt: platform.createdAt,
    updatedAt: platform.updatedAt,
  }
}

async function getOwnedPlatform(userId: string, id: string) {
  return prisma.aiPlatform.findFirst({
    where: { id, userId },
  })
}

export async function PUT(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await getOwnedPlatform(currentUser.id, id)

  if (!existing) {
    return NextResponse.json({ error: "Platform not found." }, { status: 404 })
  }

  try {
    const body = await request.json()
    const provider = String(body.provider ?? existing.provider).trim()
    const name = String(body.name ?? existing.name).trim()
    const modelId = String(body.modelId ?? existing.modelId).trim()
    const apiKeyInput = String(body.apiKey ?? "").trim()
    const baseUrlInput = body.baseUrl
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : existing.isActive

    if (!isAiProvider(provider)) {
      return NextResponse.json(
        { error: "Provider must be gemini or huggingface." },
        { status: 400 },
      )
    }

    if (!name || !modelId) {
      return NextResponse.json(
        { error: "Name and model are required." },
        { status: 400 },
      )
    }

    const meta = getProviderMeta(provider)
    const platform = await prisma.aiPlatform.update({
      where: { id },
      data: {
        provider,
        name,
        modelId,
        apiKey: apiKeyInput || existing.apiKey,
        baseUrl:
          baseUrlInput === undefined
            ? existing.baseUrl
            : String(baseUrlInput).trim() || meta?.defaultBaseUrl || null,
        isActive,
      },
    })

    return NextResponse.json({ platform: serializePlatform(platform) })
  } catch (error) {
    console.error("Failed to update AI platform:", error)
    return NextResponse.json(
      { error: "Unable to update AI platform." },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await getOwnedPlatform(currentUser.id, id)

  if (!existing) {
    return NextResponse.json({ error: "Platform not found." }, { status: 404 })
  }

  await prisma.aiPlatform.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
