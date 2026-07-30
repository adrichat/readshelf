import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

export const proxy = auth

// Le matcher exclut délibérément /api/** : ce middleware ne protège que les
// pages. Toute nouvelle route sous app/api/** doit vérifier l'auth elle-même
// (voir lib/require-auth.ts) — rien ici ne le fait à sa place.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
