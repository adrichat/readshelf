import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/require-auth"
import { rateLimit } from "@/lib/rate-limit"
import { parseJsonBody } from "@/lib/api/parse-body"
import { isValidHexColor, isValidSolidOrGradientBackground } from "@/lib/color-validation"

// Payloads de fond d'écran en base64 potentiellement volumineux envoyés en
// boucle par un compte connecté — limité par utilisateur.
const PATCH_LIMIT = 10
const PATCH_WINDOW_MS = 60_000

const PatchBodySchema = z.object({
  backgroundType: z.enum(["COLOR", "GRADIENT", "IMAGE"]).optional(),
  backgroundValue: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  layoutType: z.enum(["GRID", "SHELF", "MOSAIC", "LIBRARY"]).optional(),
  effectType: z.enum(["PARTICLES", "AMBIENT_GLOW", "NOISE"]).nullable().optional(),
  shelfColor: z.string().optional(),
  seoTitle: z.string().max(60).nullable().optional(),
  seoDescription: z.string().max(160).nullable().optional(),
  bio: z.string().max(200).nullable().optional(),
  displayName: z.string().max(50).nullable().optional(),
})

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
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  if (!rateLimit(`profile-patch:${session.user.id}`, PATCH_LIMIT, PATCH_WINDOW_MS)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const { data, error } = await parseJsonBody(req, PatchBodySchema)
  if (error) return error
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
  } = data

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
  } else if (backgroundValue !== undefined) {
    // Le type peut être omis dans une mise à jour partielle (seule la valeur
    // change) : on retombe alors sur COLOR, seul format compatible avec un
    // ancien fond uni déjà enregistré.
    const type = backgroundType === "GRADIENT" ? "GRADIENT" : "COLOR"
    if (!isValidSolidOrGradientBackground(type, backgroundValue)) {
      return NextResponse.json({ error: "INVALID_BACKGROUND" }, { status: 400 })
    }
  }

  if (accentColor !== undefined && !isValidHexColor(accentColor)) {
    return NextResponse.json({ error: "INVALID_ACCENT_COLOR" }, { status: 400 })
  }
  if (shelfColor !== undefined && !isValidHexColor(shelfColor)) {
    return NextResponse.json({ error: "INVALID_SHELF_COLOR" }, { status: 400 })
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
