export const AI_PROVIDERS = [
  {
    value: "gemini",
    label: "Google Gemini",
    description: "Google Generative AI models",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.5-flash-preview-05-20",
    ],
  },
  {
    value: "huggingface",
    label: "Hugging Face",
    description: "Open models via Hugging Face Inference",
    defaultBaseUrl: "https://router.huggingface.co/hf-inference",
    models: [
      "mistralai/Mistral-7B-Instruct-v0.3",
      "meta-llama/Meta-Llama-3-8B-Instruct",
      "HuggingFaceH4/zephyr-7b-beta",
      "google/flan-t5-large",
      "microsoft/Phi-3-mini-4k-instruct",
    ],
  },
] as const

export type AiProviderValue = (typeof AI_PROVIDERS)[number]["value"]

export function isAiProvider(value: string): value is AiProviderValue {
  return AI_PROVIDERS.some((provider) => provider.value === value)
}

export function getProviderMeta(provider: string) {
  return AI_PROVIDERS.find((item) => item.value === provider)
}

export function maskApiKey(apiKey: string) {
  if (apiKey.length <= 8) return "••••••••"
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`
}

export type AiTestResult = {
  ok: boolean
  message: string
  output?: string
}

function truncate(text: string, max = 280) {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max)}…`
}

export async function testGeminiConnection(options: {
  apiKey: string
  modelId: string
  baseUrl?: string | null
}): Promise<AiTestResult> {
  const base =
    options.baseUrl?.replace(/\/$/, "") ||
    "https://generativelanguage.googleapis.com/v1beta"
  const modelId = options.modelId.replace(/^models\//, "")
  const url = `${base}/models/${modelId}:generateContent?key=${encodeURIComponent(options.apiKey)}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: "Reply with exactly: Gemini connection OK" }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 32,
        temperature: 0,
      },
    }),
  })

  const data = (await response.json().catch(() => null)) as {
    error?: { message?: string }
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  } | null

  if (!response.ok) {
    return {
      ok: false,
      message:
        data?.error?.message ??
        `Gemini request failed with status ${response.status}.`,
    }
  }

  const output = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim()

  if (!output) {
    return {
      ok: false,
      message: "Gemini responded but returned no text.",
    }
  }

  return {
    ok: true,
    message: "Gemini connection successful.",
    output: truncate(output),
  }
}

export async function testHuggingFaceConnection(options: {
  apiKey: string
  modelId: string
  baseUrl?: string | null
}): Promise<AiTestResult> {
  const base =
    options.baseUrl?.replace(/\/$/, "") ||
    "https://router.huggingface.co/hf-inference"
  const url = `${base}/models/${options.modelId}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: "Reply with exactly: Hugging Face connection OK",
      parameters: {
        max_new_tokens: 32,
        temperature: 0.1,
        return_full_text: false,
      },
    }),
  })

  const data = (await response.json().catch(() => null)) as
    | {
        error?: string
        estimated_time?: number
        generated_text?: string
      }
    | Array<{ generated_text?: string }>
    | null

  if (!response.ok) {
    const errorMessage =
      data && !Array.isArray(data)
        ? data.error ||
          (data.estimated_time
            ? `Model is loading. Try again in ~${Math.ceil(data.estimated_time)}s.`
            : undefined)
        : undefined

    return {
      ok: false,
      message:
        errorMessage ??
        `Hugging Face request failed with status ${response.status}.`,
    }
  }

  let output = ""
  if (Array.isArray(data)) {
    output = data.map((item) => item.generated_text ?? "").join("").trim()
  } else if (data?.generated_text) {
    output = data.generated_text.trim()
  }

  if (!output) {
    return {
      ok: false,
      message: "Hugging Face responded but returned no text.",
    }
  }

  return {
    ok: true,
    message: "Hugging Face connection successful.",
    output: truncate(output),
  }
}

export async function testAiPlatform(options: {
  provider: string
  apiKey: string
  modelId: string
  baseUrl?: string | null
}): Promise<AiTestResult> {
  if (options.provider === "gemini") {
    return testGeminiConnection(options)
  }

  if (options.provider === "huggingface") {
    return testHuggingFaceConnection(options)
  }

  return {
    ok: false,
    message: "Unsupported AI provider.",
  }
}
