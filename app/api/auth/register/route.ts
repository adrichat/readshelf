import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { sendVerificationEmail, sendAccountExistsEmail } from "@/lib/resend"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import {
  generateVerificationToken,
  hashVerificationToken,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/lib/verification-token"
import { isValidUsername } from "@/lib/username-validation"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Une inscription est un événement rare pour un vrai utilisateur — large
// marge contre les faux positifs, suffisant pour freiner un bot en boucle.
const REGISTER_LIMIT = 8
const REGISTER_WINDOW_MS = 15 * 60_000

export async function POST(req: NextRequest) {
  if (!rateLimit(`register:${clientIp(req)}`, REGISTER_LIMIT, REGISTER_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie dans quelques minutes." },
      { status: 429 }
    )
  }

  const { username, email, password } = await req.json()

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "Nom d'utilisateur invalide." }, { status: 400 })
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 })
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 8 caractères." },
      { status: 400 }
    )
  }

  const [existingUsername, existingEmail] = await Promise.all([
    db.user.findUnique({ where: { username } }),
    db.user.findUnique({ where: { email } }),
  ])

  if (existingUsername) {
    return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris." }, { status: 409 })
  }

  if (existingEmail) {
    // Ne révèle pas qu'un compte existe déjà avec cet email (même logique
    // anti-énumération que forgot-password/resend-verification) : réponse
    // identique à un succès, on prévient juste le titulaire du compte par
    // email au lieu de créer un doublon.
    try {
      await sendAccountExistsEmail(email)
    } catch (err) {
      console.error("Failed to send account-exists email:", err)
    }
    return NextResponse.json({ ok: true })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      username,
      displayName: username,
    },
  })
  await db.profile.create({ data: { userId: user.id } })

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

  return NextResponse.json({ ok: true })
}
