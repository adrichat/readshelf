import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

// Fond animé : gif uniquement (un autre format perdrait l'intérêt de l'animation)
// et réservé aux comptes premium, comme le GIF d'avatar dans /api/user/profile
const BACKGROUND_GIF_MAX_LENGTH = 6_000_000

function isValidBackgroundGif(value: string): boolean {
  const m = value.match(/^data:image\/gif;base64,([A-Za-z0-9+/]+=*)$/)
  if (!m) return false
  if (value.length > BACKGROUND_GIF_MAX_LENGTH) return false
  const head = Buffer.from(m[1].slice(0, 32), "base64")
  return ["GIF87a", "GIF89a"].includes(head.toString("ascii", 0, 6))
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const {
    backgroundType,
    backgroundValue,
    accentColor,
    fontFamily,
    layoutType,
    effectType,
    shelfColor,
    seoTitle,
    seoDescription,
    bio,
    displayName,
  } = body

  // Les options premium ne passent que si le compte l'est réellement
  const hasPremiumFields =
    fontFamily !== undefined ||
    layoutType !== undefined ||
    effectType !== undefined ||
    shelfColor !== undefined ||
    seoTitle !== undefined ||
    seoDescription !== undefined ||
    backgroundType === "IMAGE"

  if (hasPremiumFields) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { isPremium: true },
    })
    if (!user?.isPremium) {
      return NextResponse.json({ error: "PREMIUM_REQUIRED" }, { status: 403 })
    }
  }

  if (backgroundType === "IMAGE") {
    if (typeof backgroundValue !== "string" || !isValidBackgroundGif(backgroundValue)) {
      return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 })
    }
  }

  const profile = await db.profile.upsert({
    where: { userId: session.user.id },
    update: {
      ...(backgroundType !== undefined && { backgroundType }),
      ...(backgroundValue !== undefined && { backgroundValue }),
      ...(accentColor !== undefined && { accentColor }),
      ...(fontFamily !== undefined && { fontFamily }),
      ...(layoutType !== undefined && { layoutType }),
      ...(effectType !== undefined && { effectType }),
      ...(shelfColor !== undefined && { shelfColor }),
      ...(seoTitle !== undefined && { seoTitle: seoTitle === "" ? null : seoTitle }),
      ...(seoDescription !== undefined && { seoDescription: seoDescription === "" ? null : seoDescription }),
    },
    create: {
      userId: session.user.id,
      backgroundType: backgroundType ?? "COLOR",
      backgroundValue: backgroundValue ?? "#0f0f0f",
      accentColor: accentColor ?? "#d97706",
      fontFamily: fontFamily ?? "inter",
      layoutType: layoutType ?? "GRID",
      effectType: effectType ?? null,
      shelfColor: shelfColor ?? undefined,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
    },
  })

  if (bio !== undefined || displayName !== undefined) {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(bio !== undefined && { bio: bio === "" ? null : bio }),
        ...(displayName !== undefined && { displayName: displayName === "" ? null : displayName }),
      },
    })
  }

  return NextResponse.json(profile)
}
