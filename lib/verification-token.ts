import crypto from "crypto"

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex")
}

export function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
