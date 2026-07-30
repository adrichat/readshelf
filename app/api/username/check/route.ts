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

  const existing = await db.user.findUnique({ where: { username } })
  return NextResponse.json({ available: !existing })
}
