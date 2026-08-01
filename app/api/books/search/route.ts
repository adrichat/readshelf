import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { searchBooks } from "@/lib/books-api"
import { rateLimit } from "@/lib/rate-limit"

// Chaque recherche coûte des appels à l'API Google Books (quota partagé) —
// réservé aux comptes connectés et limité par utilisateur pour éviter
// qu'un usage abusif n'épuise le quota pour tout le monde. La modal émet
// deux requêtes par recherche (rapide + complète), d'où la limite doublée.
const SEARCH_LIMIT = 60
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

  // ?full=1 : recherche complète (Google + Open Library, plus lente) ; sans le
  // paramètre : mode rapide Google seul, affiché immédiatement par la modal.
  const includeOpenLibrary = req.nextUrl.searchParams.get("full") === "1"

  try {
    const results = await searchBooks(query.trim(), { includeOpenLibrary })
    return NextResponse.json(results)
  } catch (err) {
    console.error("[api/books/search] erreur inattendue:", err)
    return NextResponse.json({ error: "search_failed" }, { status: 502 })
  }
}
