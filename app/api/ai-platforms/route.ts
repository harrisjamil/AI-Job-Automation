import { NextResponse } from "next/server"
import {
  getProviderMeta,
  isAiProvider,
  maskApiKey,
} from "@/lib/ai-platforms"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

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

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const platforms = await prisma.aiPlatform.findMany({
    where: { userId: currentUser.id },
    orderBy: [{ provider: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({
    platforms: platforms.map(serializePlatform),
  })
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const provider = String(body.provider ?? "").trim()
    const name = String(body.name ?? "").trim()
    const apiKey = String(body.apiKey ?? "").trim()
    const modelId = String(body.modelId ?? "").trim()
    const baseUrl = String(body.baseUrl ?? "").trim() || null
    const isActive = body.isActive !== false

    if (!isAiProvider(provider)) {
      return NextResponse.json(
        { error: "Provider must be gemini or huggingface." },
        { status: 400 },
      )
    }

    if (!name || !apiKey || !modelId) {
      return NextResponse.json(
        { error: "Name, API key, and model are required." },
        { status: 400 },
      )
    }

    const meta = getProviderMeta(provider)
    const platform = await prisma.aiPlatform.create({
      data: {
        userId: currentUser.id,
        provider,
        name,
        apiKey,
        modelId,
        baseUrl: baseUrl || meta?.defaultBaseUrl || null,
        isActive,
      },
    })

    return NextResponse.json(
      { platform: serializePlatform(platform) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Failed to create AI platform:", error)
    return NextResponse.json(
      { error: "Unable to save AI platform." },
      { status: 500 },
    )
  }
}
