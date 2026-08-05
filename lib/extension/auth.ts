import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

export function hashExtensionToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function createExtensionToken(options: {
  userId: string
  label?: string
}) {
  const raw = `aja_${randomBytes(24).toString("base64url")}`
  const tokenHash = hashExtensionToken(raw)
  const tokenPrefix = `${raw.slice(0, 10)}…`

  const record = await prisma.extensionToken.create({
    data: {
      userId: options.userId,
      tokenHash,
      tokenPrefix,
      label: options.label?.trim() || "Chrome extension",
    },
  })

  return { token: raw, record }
}

export async function revokeExtensionToken(userId: string, id: string) {
  return prisma.extensionToken.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function authenticateExtensionToken(token: string | null) {
  if (!token?.startsWith("aja_")) return null
  const tokenHash = hashExtensionToken(token)
  const record = await prisma.extensionToken.findFirst({
    where: { tokenHash, revokedAt: null },
    include: {
      user: {
        select: { id: true, fullName: true, email: true },
      },
    },
  })
  if (!record) return null

  await prisma.extensionToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  })

  return record.user
}

export function getBearerToken(request: Request) {
  const auth = request.headers.get("authorization")
  if (!auth) return null
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}
