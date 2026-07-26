import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

const RESERVED = ["api", "login", "register", "dashboard", "admin", "demo", "404", "500"]

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")
  if (!username) return NextResponse.json({ available: false })

  if (RESERVED.includes(username.toLowerCase())) {
    return NextResponse.json({ available: false })
  }

  const existing = await db.user.findUnique({ where: { username } })
  return NextResponse.json({ available: !existing })
}
