import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Discord from "next-auth/providers/discord"

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = nextUrl.pathname.startsWith("/dashboard")
      const isAuthPage = ["/login", "/register"].some((p) =>
        nextUrl.pathname.startsWith(p)
      )

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl))
      }
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      // La redirection de l'accueil vers le dashboard se fait ici plutôt que
      // dans app/page.tsx : y appeler auth() lisait les cookies et rendait la
      // page d'accueil dynamique, donc impossible à servir depuis le CDN.
      // Ce middleware tourne déjà sur chaque requête de page — le test est
      // gratuit, et l'accueil redevient statique.
      if (nextUrl.pathname === "/" && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
  },
} satisfies NextAuthConfig
