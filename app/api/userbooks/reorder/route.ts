import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orderedIds } = await req.json()
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  await db.$transaction(
    orderedIds.map((id: string, index: number) =>
      db.userBook.updateMany({
        where: { id, userId: session.user!.id! },
        data: { order: index },
      })
    )
  )

  return NextResponse.json({ success: true })
}
