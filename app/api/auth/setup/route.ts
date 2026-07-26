import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const username = req.nextUrl.searchParams.get("username")
  if (!username) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (user && !user.username) {
    const taken = await db.user.findUnique({ where: { username } })
    if (!taken) {
      await db.user.update({
        where: { id: session.user.id },
        data: { username, displayName: user.name ?? username },
      })
      await db.profile.create({
        data: { userId: session.user.id },
      })
    }
  }

  return NextResponse.redirect(new URL("/dashboard", req.url))
}
