import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
import { db } from "@/lib/db"

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials"
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified"
}

// Nombre de jours calendaires (UTC) écoulés entre deux dates
function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 86_400_000
  const fromUTC = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const toUTC = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((toUTC - fromUTC) / MS_PER_DAY)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (typeof email !== "string" || typeof password !== "string") {
          throw new InvalidCredentialsError()
        }

        const user = await db.user.findUnique({ where: { email } })
        if (!user?.password) {
          throw new InvalidCredentialsError()
        }

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
          throw new InvalidCredentialsError()
        }

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError()
        }

        return user
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session: updateData }) {
      // L'avatar est stocké en data URL base64 (jusqu'à plusieurs Mo) dans User.image.
      // Next-auth copie ce champ dans le JWT par défaut : on le retire pour ne pas
      // faire exploser le cookie de session (headers de réponse trop volumineux).
      delete (token as { picture?: unknown }).picture
      if (user?.id) {
        token.id = user.id
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { username: true, lastLoginAt: true, currentStreak: true, bestStreak: true },
        })
        token.username = dbUser?.username ?? null

        // Streak de connexion : +1 si connexion le jour suivant la dernière,
        // inchangé si déjà connecté aujourd'hui, remis à 1 sinon.
        if (dbUser) {
          const now = new Date()
          const diff = dbUser.lastLoginAt ? daysBetween(dbUser.lastLoginAt, now) : null
          const currentStreak = diff === 0 ? dbUser.currentStreak : diff === 1 ? dbUser.currentStreak + 1 : 1
          await db.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: now,
              currentStreak,
              bestStreak: Math.max(dbUser.bestStreak, currentStreak),
            },
          })
        }
      }
      // update() côté client → rafraîchit le username dans le token
      if (trigger === "update" && typeof updateData?.username === "string") {
        token.username = updateData.username
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string | null
      return session
    },
  },
})
