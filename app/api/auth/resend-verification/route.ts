import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/resend"
import {
  generateVerificationToken,
  hashVerificationToken,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/lib/verification-token"

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (typeof email === "string" && email) {
    const user = await db.user.findUnique({ where: { email } })

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
