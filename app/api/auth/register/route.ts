import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/resend"
import {
  generateVerificationToken,
  hashVerificationToken,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/lib/verification-token"

const RESERVED = ["api", "login", "register", "dashboard", "admin", "demo", "setup", "404", "500"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const { username, email, password } = await req.json()

  if (!username || typeof username !== "string" || !/^[a-z0-9_-]{3,30}$/.test(username)) {
    return NextResponse.json({ error: "Nom d'utilisateur invalide." }, { status: 400 })
  }
  if (RESERVED.includes(username)) {
    return NextResponse.json({ error: "Ce nom d'utilisateur est réservé." }, { status: 400 })
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
    return NextResponse.json(
      { error: "Un compte existe déjà avec cette adresse email." },
      { status: 409 }
    )
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
