import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { isValidUsername } from "@/lib/username-validation"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { username } = await req.json()

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: "Taken" }, { status: 409 })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      username,
      displayName: session.user.name ?? username,
    },
  })

  // Crée le profil si absent
  await db.profile.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  })

  return NextResponse.json({ username })
}
