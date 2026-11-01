import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import { isValidUsername } from "@/lib/username-validation"

// Endpoint public non authentifié — limité par IP pour éviter l'énumération
// de usernames existants et le spam de lookups DB.
const CHECK_LIMIT = 20
const CHECK_WINDOW_MS = 60_000

export async function GET(req: NextRequest) {
  if (!rateLimit(`username-check:${clientIp(req)}`, CHECK_LIMIT, CHECK_WINDOW_MS)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const username = req.nextUrl.searchParams.get("username")
  if (!isValidUsername(username)) {
    return NextResponse.json({ available: false })
  }

  // select explicite : sans lui, ce simple test de disponibilité — appelé à
  // chaque frappe — remontait toute la ligne User, avatar base64 compris.
  const existing = await db.user.findUnique({ where: { username }, select: { id: true } })
  return NextResponse.json({ available: !existing })
}
