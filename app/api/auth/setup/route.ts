import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { isValidUsername } from "@/lib/username-validation"
import { rateLimit } from "@/lib/rate-limit"

const SETUP_LIMIT = 10
const SETUP_WINDOW_MS = 15 * 60_000

// Callback appelé par NextAuth après un sign-up OAuth (Google/Discord) — la
// redirection finale du flux OAuth est un GET, on ne peut pas la faire passer
// en POST. Le username choisi sur /register est donc transmis via un cookie
// posé par le client juste avant signIn() (voir app/(auth)/register/page.tsx),
// jamais via la query string : un lien piégé vers cette URL ne peut pas poser
// ce cookie à la place de l'utilisateur (cookie same-origin, pas de XSS connu
// sur ce domaine), alors qu'il pourrait librement choisir un ?username=...
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const response = NextResponse.redirect(new URL("/dashboard", req.url))
  response.cookies.delete("pending_username")

  if (!rateLimit(`setup:${session.user.id}`, SETUP_LIMIT, SETUP_WINDOW_MS)) {
    return response
  }

  const username = req.cookies.get("pending_username")?.value
  if (!isValidUsername(username)) {
    return response
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (user && !user.username) {
    const taken = await db.user.findUnique({ where: { username } })
    if (!taken) {
      await db.user.update({
        where: { id: session.user.id },
        data: { username, displayName: user.name ?? username },
      })
      await db.profile.create({
        data: { userId: session.user.id },
      })
    }
  }

  return response
}
