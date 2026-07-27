import crypto from "crypto"

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex")
}

export function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000

// Les tokens de reset de mot de passe partagent la table VerificationToken
// (même mécanisme, même TTL géré côté appelant) mais avec un identifier
// préfixé : sans ça, un token de vérification d'email intercepté pourrait
// être rejoué pour réinitialiser le mot de passe d'un compte (même table,
// recherche par token seul dans /api/auth/verify).
const PASSWORD_RESET_PREFIX = "reset:"

export function passwordResetIdentifier(email: string) {
  return `${PASSWORD_RESET_PREFIX}${email}`
}

export function emailFromPasswordResetIdentifier(identifier: string): string | null {
  return identifier.startsWith(PASSWORD_RESET_PREFIX) ? identifier.slice(PASSWORD_RESET_PREFIX.length) : null
}
