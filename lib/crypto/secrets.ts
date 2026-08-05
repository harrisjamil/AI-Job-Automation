import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const PREFIX = "enc:v1:"

function getKey(): Buffer {
  const secret = process.env.SECRETS_ENCRYPTION_KEY?.trim()
  if (!secret) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY is not set. Add a long random string to .env to encrypt API keys and SMTP passwords."
    )
  }
  return createHash("sha256").update(secret).digest()
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith(PREFIX))
}

/**
 * Encrypt a secret for DB storage. Empty/null stays null.
 * Already-encrypted values are returned unchanged.
 */
export function encryptSecret(
  value: string | null | undefined
): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (isEncryptedSecret(trimmed)) return trimmed

  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(trimmed, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
}

/**
 * Decrypt a secret from DB. Plaintext legacy values are returned as-is
 * so existing rows keep working until migrated.
 */
export function decryptSecret(
  value: string | null | undefined
): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!isEncryptedSecret(trimmed)) return trimmed

  const payload = trimmed.slice(PREFIX.length)
  const [ivB64, tagB64, dataB64] = payload.split(".")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Corrupt encrypted secret")
  }

  const key = getKey()
  const iv = Buffer.from(ivB64, "base64url")
  const tag = Buffer.from(tagB64, "base64url")
  const data = Buffer.from(dataB64, "base64url")
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString("utf8")
}

/** Decrypt for use; returns empty string if missing. */
export function revealSecret(value: string | null | undefined): string {
  return decryptSecret(value) ?? ""
}

export function maskRevealedSecret(value: string | null | undefined) {
  const plain = decryptSecret(value)
  if (!plain) return null
  if (plain.length <= 8) return "••••••••"
  return `${plain.slice(0, 4)}••••${plain.slice(-4)}`
}

/**
 * If value is plaintext legacy, encrypt and return new ciphertext.
 * If already encrypted or empty, return null (no update needed).
 */
export function maybeEncryptPlaintext(
  value: string | null | undefined
): string | null {
  if (!value?.trim()) return null
  if (isEncryptedSecret(value)) return null
  return encryptSecret(value)
}
