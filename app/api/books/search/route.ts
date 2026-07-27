import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { searchBooks } from "@/lib/books-api"
import { rateLimit } from "@/lib/rate-limit"

// Chaque recherche coûte un appel à l'API Google Books (quota partagé) —
// réservé aux comptes connectés et limité par utilisateur pour éviter
// qu'un usage abusif n'épuise le quota pour tout le monde.
const SEARCH_LIMIT = 30
const SEARCH_WINDOW_MS = 60_000

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!rateLimit(`books-search:${session.user.id}`, SEARCH_LIMIT, SEARCH_WINDOW_MS)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const query = req.nextUrl.searchParams.get("q")
  if (!query || query.trim().length < 2) {
    return NextResponse.json([])
  }

  try {
    const results = await searchBooks(query.trim())
    return NextResponse.json(results)
  } catch (err) {
    console.error("[api/books/search] erreur inattendue:", err)
    return NextResponse.json({ error: "search_failed" }, { status: 502 })
  }
}
