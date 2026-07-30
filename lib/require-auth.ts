import { NextResponse } from "next/server"
import { auth } from "@/auth"

type AuthResult = { session: { user: { id: string } }; error?: undefined } | { session?: undefined; error: NextResponse }

// proxy.ts n'intercepte que les pages (son matcher exclut /api) : chaque route
// API doit vérifier l'auth elle-même. Ce helper rend ce pattern plus court à
// écrire correctement qu'à oublier.
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { session: { user: { id: session.user.id } } }
}
