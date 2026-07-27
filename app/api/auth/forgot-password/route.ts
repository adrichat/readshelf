import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/resend"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import {
  generateVerificationToken,
  hashVerificationToken,
  passwordResetIdentifier,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/lib/verification-token"

// Même logique que resend-verification : limité par email (le vecteur d'abus
// réel) et par IP en complément.
const RESET_EMAIL_LIMIT = 3
const RESET_IP_LIMIT = 10
const RESET_WINDOW_MS = 15 * 60_000

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  const ipAllowed = rateLimit(`forgot-password:ip:${clientIp(req)}`, RESET_IP_LIMIT, RESET_WINDOW_MS)

  if (ipAllowed && typeof email === "string" && email) {
    const emailAllowed = rateLimit(`forgot-password:email:${email.toLowerCase()}`, RESET_EMAIL_LIMIT, RESET_WINDOW_MS)
    const user = emailAllowed ? await db.user.findUnique({ where: { email } }) : null

    // Seuls les comptes email/mot de passe ont un mot de passe à réinitialiser
    // (un compte Google/Discord pur n'a pas de champ `password`)
    if (user?.password) {
      const identifier = passwordResetIdentifier(email)
      await db.verificationToken.deleteMany({ where: { identifier } })

      const token = generateVerificationToken()
      await db.verificationToken.create({
        data: {
          identifier,
          token: hashVerificationToken(token),
          expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
        },
      })
      try {
        await sendPasswordResetEmail(email, token)
      } catch (err) {
        console.error("Failed to send password reset email:", err)
      }
    }
  }

  // Réponse identique dans tous les cas pour ne pas révéler si l'email existe
  return NextResponse.json({ ok: true })
}
