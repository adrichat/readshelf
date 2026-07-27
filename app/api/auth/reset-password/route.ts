import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import { hashVerificationToken, emailFromPasswordResetIdentifier } from "@/lib/verification-token"

// Le token est un secret aléatoire de 256 bits (pas de brute-force possible) —
// cette limite protège juste contre un scan automatisé grossier de l'endpoint.
const RESET_IP_LIMIT = 20
const RESET_WINDOW_MS = 15 * 60_000

export async function POST(req: NextRequest) {
  if (!rateLimit(`reset-password:ip:${clientIp(req)}`, RESET_IP_LIMIT, RESET_WINDOW_MS)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })
  }

  const { token, password } = await req.json()

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 })
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "WEAK_PASSWORD", message: "Le mot de passe doit faire au moins 8 caractères." },
      { status: 400 }
    )
  }

  const hashed = hashVerificationToken(token)
  const verificationToken = await db.verificationToken.findFirst({ where: { token: hashed } })
  const email = verificationToken ? emailFromPasswordResetIdentifier(verificationToken.identifier) : null

  if (!verificationToken || !email) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 })
  }

  if (verificationToken.expires < new Date()) {
    await db.verificationToken.delete({
      where: {
        identifier_token: { identifier: verificationToken.identifier, token: verificationToken.token },
      },
    })
    return NextResponse.json({ error: "EXPIRED_TOKEN" }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  await db.user.update({ where: { email }, data: { password: hashedPassword } })

  // Invalide tout autre token de reset en attente pour ce compte
  await db.verificationToken.deleteMany({ where: { identifier: verificationToken.identifier } })

  return NextResponse.json({ ok: true })
}
