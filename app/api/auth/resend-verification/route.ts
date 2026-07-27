import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/resend"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import {
  generateVerificationToken,
  hashVerificationToken,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/lib/verification-token"

// Limité par email (le vecteur d'abus réel : bombarder la boîte mail d'un
// tiers) et par IP en complément, sans jamais révéler dans la réponse
// laquelle des deux limites a été atteinte.
const RESEND_EMAIL_LIMIT = 3
const RESEND_IP_LIMIT = 10
const RESEND_WINDOW_MS = 15 * 60_000

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  const ipAllowed = rateLimit(`resend-verification:ip:${clientIp(req)}`, RESEND_IP_LIMIT, RESEND_WINDOW_MS)

  if (ipAllowed && typeof email === "string" && email) {
    const emailAllowed = rateLimit(`resend-verification:email:${email.toLowerCase()}`, RESEND_EMAIL_LIMIT, RESEND_WINDOW_MS)
    const user = emailAllowed ? await db.user.findUnique({ where: { email } }) : null

    if (user?.password && !user.emailVerified) {
      await db.verificationToken.deleteMany({ where: { identifier: email } })

      const token = generateVerificationToken()
      await db.verificationToken.create({
        data: {
          identifier: email,
          token: hashVerificationToken(token),
          expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        },
      })
      try {
        await sendVerificationEmail(email, token)
      } catch (err) {
        console.error("Failed to send verification email:", err)
      }
    }
  }

  // Réponse identique dans tous les cas pour ne pas révéler si l'email existe
  return NextResponse.json({ ok: true })
}
