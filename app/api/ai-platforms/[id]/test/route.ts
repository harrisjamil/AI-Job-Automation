import { NextResponse } from "next/server"
import { testAiPlatform } from "@/lib/ai-platforms"
import { decryptSecret } from "@/lib/crypto/secrets"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const platform = await prisma.aiPlatform.findFirst({
    where: { id, userId: currentUser.id },
  })

  if (!platform) {
    return NextResponse.json({ error: "Platform not found." }, { status: 404 })
  }

  try {
    const result = await testAiPlatform({
      provider: platform.provider,
      apiKey: decryptSecret(platform.apiKey) || "",
      modelId: platform.modelId,
      baseUrl: platform.baseUrl,
    })

    const updated = await prisma.aiPlatform.update({
      where: { id: platform.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: result.ok ? "success" : "failed",
        lastTestMessage: result.output
          ? `${result.message} Output: ${result.output}`
          : result.message,
      },
      select: {
        id: true,
        lastTestedAt: true,
        lastTestStatus: true,
        lastTestMessage: true,
      },
    })

    return NextResponse.json({
      ok: result.ok,
      message: result.message,
      output: result.output,
      platform: updated,
    })
  } catch (error) {
    console.error("AI platform test failed:", error)

    const message =
      error instanceof Error ? error.message : "Unable to test AI platform."

    const updated = await prisma.aiPlatform.update({
      where: { id: platform.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: "failed",
        lastTestMessage: message,
      },
      select: {
        id: true,
        lastTestedAt: true,
        lastTestStatus: true,
        lastTestMessage: true,
      },
    })

    return NextResponse.json(
      {
        ok: false,
        message,
        platform: updated,
      },
      { status: 500 },
    )
  }
}
