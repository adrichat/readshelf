import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(null, { status: 401 })
  }

  const [profile, user] = await Promise.all([
    db.profile.findUnique({ where: { userId: session.user.id } }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { bio: true, displayName: true, isPremium: true },
    }),
  ])

  return NextResponse.json({
    ...profile,
    bio: user?.bio,
    displayName: user?.displayName,
    isPremium: user?.isPremium ?? false,
  })
}
