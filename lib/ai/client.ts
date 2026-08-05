import { prisma } from "@/lib/prisma"
import { decryptSecret } from "@/lib/crypto/secrets"

export type AiPlatformConfig = {
  provider: string
  apiKey: string
  modelId: string
  baseUrl: string | null
}

export async function getActiveAiPlatform(
  userId: string
): Promise<AiPlatformConfig | null> {
  const platform = await prisma.aiPlatform.findFirst({
    where: { userId, isActive: true },
    orderBy: [{ lastTestStatus: "desc" }, { updatedAt: "desc" }],
  })

  if (!platform) return null

  const apiKey = decryptSecret(platform.apiKey)
  if (!apiKey) return null

  return {
    provider: platform.provider,
    apiKey,
    modelId: platform.modelId,
    baseUrl: platform.baseUrl,
  }
}

export async function generateAiText(options: {
  platform: AiPlatformConfig
  prompt: string
  system?: string
  maxTokens?: number
}): Promise<string> {
  const { platform, prompt, system, maxTokens = 1024 } = options

  if (platform.provider === "gemini") {
    return generateGemini({ platform, prompt, system, maxTokens })
  }

  if (platform.provider === "huggingface") {
    return generateHuggingFace({ platform, prompt, system, maxTokens })
  }

  throw new Error(`Unsupported AI provider: ${platform.provider}`)
}

async function generateGemini(options: {
  platform: AiPlatformConfig
  prompt: string
  system?: string
  maxTokens: number
}): Promise<string> {
  const base =
    options.platform.baseUrl?.replace(/\/$/, "") ||
    "https://generativelanguage.googleapis.com/v1beta"
  const modelId = options.platform.modelId.replace(/^models\//, "")
  const url = `${base}/models/${modelId}:generateContent?key=${encodeURIComponent(options.platform.apiKey)}`

  const contents: Array<{ role?: string; parts: Array<{ text: string }> }> = []
  if (options.system) {
    contents.push({ role: "user", parts: [{ text: options.system }] })
    contents.push({
      role: "model",
      parts: [{ text: "Understood. I will follow these instructions." }],
    })
  }
  contents.push({ role: "user", parts: [{ text: options.prompt }] })

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: 0.3,
      },
    }),
  })

  const data = (await response.json().catch(() => null)) as {
    error?: { message?: string }
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  } | null

  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? `Gemini failed with status ${response.status}`
    )
  }

  const output = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim()

  if (!output) throw new Error("Gemini returned no text")
  return output
}

async function generateHuggingFace(options: {
  platform: AiPlatformConfig
  prompt: string
  system?: string
  maxTokens: number
}): Promise<string> {
  const base =
    options.platform.baseUrl?.replace(/\/$/, "") ||
    "https://router.huggingface.co/hf-inference"
  const url = `${base}/models/${options.platform.modelId}`
  const fullPrompt = options.system
    ? `${options.system}\n\n${options.prompt}`
    : options.prompt

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.platform.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: options.maxTokens,
        temperature: 0.3,
        return_full_text: false,
      },
    }),
  })

  const data = (await response.json().catch(() => null)) as
    | {
        error?: string
        generated_text?: string
      }
    | Array<{ generated_text?: string }>
    | null

  if (!response.ok) {
    const errorMessage =
      data && !Array.isArray(data) ? data.error : undefined
    throw new Error(
      errorMessage ?? `Hugging Face failed with status ${response.status}`
    )
  }

  let output = ""
  if (Array.isArray(data)) {
    output = data.map((item) => item.generated_text ?? "").join("").trim()
  } else if (data?.generated_text) {
    output = data.generated_text.trim()
  }

  if (!output) throw new Error("Hugging Face returned no text")
  return output
}

export function extractJsonArray(text: string): unknown[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced?.[1]?.trim() ?? text.trim()
  const arrayMatch = raw.match(/\[[\s\S]*\]/)
  if (!arrayMatch) return []
  try {
    const parsed = JSON.parse(arrayMatch[0])
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced?.[1]?.trim() ?? text.trim()
  const objectMatch = raw.match(/\{[\s\S]*\}/)
  if (!objectMatch) return null
  try {
    const parsed = JSON.parse(objectMatch[0])
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
