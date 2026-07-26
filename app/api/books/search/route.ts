import { NextRequest, NextResponse } from "next/server"
import { searchBooks } from "@/lib/books-api"

export async function GET(req: NextRequest) {
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
