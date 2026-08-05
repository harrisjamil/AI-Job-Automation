/**
 * Post a simple message to a Slack incoming webhook.
 * Returns false when no webhook is configured or the request fails.
 */
export async function sendSlackWebhook(
  webhookUrl: string | null | undefined,
  text: string
) {
  const url = webhookUrl?.trim()
  if (!url) return { sent: false as const, reason: "no_webhook" as const }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      return {
        sent: false as const,
        reason: "http_error" as const,
        status: response.status,
      }
    }
    return { sent: true as const }
  } catch (error) {
    return {
      sent: false as const,
      reason: "network" as const,
      error: error instanceof Error ? error.message : "Slack failed",
    }
  }
}
