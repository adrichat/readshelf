import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashVerificationToken } from "@/lib/verification-token"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url))
  }

  const hashed = hashVerificationToken(token)
  const verificationToken = await db.verificationToken.findFirst({
    where: { token: hashed },
  })

  // Un token de reset de mot de passe partage la table mais ne doit jamais
  // pouvoir vérifier un email (voir lib/verification-token.ts)
  if (!verificationToken || verificationToken.identifier.startsWith("reset:")) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url))
  }

  if (verificationToken.expires < new Date()) {
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    })
    return NextResponse.redirect(new URL("/login?error=expired_token", req.url))
  }

  await db.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  })
  await db.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
      },
    },
  })

  return NextResponse.redirect(new URL("/login?verified=1", req.url))
}
