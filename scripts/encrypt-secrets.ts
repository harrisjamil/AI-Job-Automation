/**
 * One-time (safe to re-run) migration: encrypt plaintext EmailAccount + AiPlatform secrets.
 *
 * Usage:
 *   pnpm secrets:encrypt
 *
 * Requires SECRETS_ENCRYPTION_KEY in .env
 */
import "dotenv/config"
import {
  isEncryptedSecret,
  maybeEncryptPlaintext,
} from "../lib/crypto/secrets"
import { prisma } from "../lib/prisma"

async function main() {
  if (!process.env.SECRETS_ENCRYPTION_KEY?.trim()) {
    throw new Error("Set SECRETS_ENCRYPTION_KEY in .env before running")
  }

  let emailUpdated = 0
  let aiUpdated = 0

  const accounts = await prisma.emailAccount.findMany()
  for (const account of accounts) {
    const apiKey = maybeEncryptPlaintext(account.apiKey)
    const smtpPass = maybeEncryptPlaintext(account.smtpPass)
    if (!apiKey && !smtpPass) continue

    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        ...(apiKey ? { apiKey } : {}),
        ...(smtpPass ? { smtpPass } : {}),
      },
    })
    emailUpdated += 1
    console.log(
      `Encrypted EmailAccount ${account.id}` +
        `${apiKey ? " apiKey" : ""}` +
        `${smtpPass ? " smtpPass" : ""}`
    )
  }

  const platforms = await prisma.aiPlatform.findMany()
  for (const platform of platforms) {
    if (isEncryptedSecret(platform.apiKey)) continue
    const apiKey = maybeEncryptPlaintext(platform.apiKey)
    if (!apiKey) continue
    await prisma.aiPlatform.update({
      where: { id: platform.id },
      data: { apiKey },
    })
    aiUpdated += 1
    console.log(`Encrypted AiPlatform ${platform.id} (${platform.name})`)
  }

  console.log(
    `\nDone. Email accounts updated: ${emailUpdated}. AI platforms updated: ${aiUpdated}.`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
