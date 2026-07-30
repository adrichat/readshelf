import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/require-auth"
import { rateLimit } from "@/lib/rate-limit"
import { parseJsonBody } from "@/lib/api/parse-body"
import { SOCIAL_FIELDS, isValidSocialUrl, isValidCustomLinkUrl, CUSTOM_LINK_TITLE_MAX } from "@/lib/social-links"

// Payloads d'avatar en base64 potentiellement volumineux envoyés en boucle
// par un compte connecté — limité par utilisateur.
const PATCH_LIMIT = 10
const PATCH_WINDOW_MS = 60_000

const PatchBodySchema = z.object({
  displayName: z.string().max(50).nullable().optional(),
  bio: z.string().max(200).nullable().optional(),
  socialLinks: z.unknown().optional(),
  image: z.unknown().optional(),
})

// L'avatar est stocké en data URL directement en base (pas d'hébergement externe).
// Les images fixes sont recadrées/compressées côté client — la limite serveur
// reste large ; les GIF sont conservés tels quels pour garder l'animation.
const IMAGE_MAX_LENGTH: Record<string, number> = {
  png: 1_400_000,
  jpeg: 1_400_000,
  webp: 1_400_000,
  gif: 4_200_000,
}

// Signatures binaires — le préfixe MIME d'un data URL est déclaratif
const IMAGE_MAGIC: Record<string, (b: Buffer) => boolean> = {
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  gif: (b) => ["GIF87a", "GIF89a"].includes(b.toString("ascii", 0, 6)),
}

async function validateImage(image: string, userId: string): Promise<NextResponse | null> {
  const m = image.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+=*)$/)
  if (!m) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 })
  }
  const [, format, b64] = m
  if (image.length > IMAGE_MAX_LENGTH[format]) {
    return NextResponse.json({ error: "IMAGE_TOO_LARGE" }, { status: 400 })
  }
  const head = Buffer.from(b64.slice(0, 32), "base64")
  if (!IMAGE_MAGIC[format](head)) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 })
  }
  // Les GIF animés sont réservés aux comptes premium
  if (format === "gif") {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    })
    if (!user?.isPremium) {
      return NextResponse.json({ error: "PREMIUM_REQUIRED" }, { status: 403 })
    }
  }
  return null
}

export async function PATCH(req: NextRequest) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  if (!rateLimit(`user-profile-patch:${session.user.id}`, PATCH_LIMIT, PATCH_WINDOW_MS)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const { data, error } = await parseJsonBody(req, PatchBodySchema)
  if (error) return error
  const { displayName, bio, socialLinks, image } = data

  const CUSTOM_LINK_KEYS = ["customLinkTitle", "customLinkUrl"]

  if (socialLinks !== undefined) {
    if (typeof socialLinks !== "object" || socialLinks === null) {
      return NextResponse.json({ error: "INVALID_SOCIAL_LINK" }, { status: 400 })
    }
    const links = socialLinks as Record<string, unknown>
    for (const field of SOCIAL_FIELDS) {
      const value = links[field.key]
      if (value && (typeof value !== "string" || !isValidSocialUrl(field.key, value))) {
        return NextResponse.json({ error: "INVALID_SOCIAL_LINK" }, { status: 400 })
      }
    }

    const customUrl = links.customLinkUrl as string | undefined
    const customTitle = links.customLinkTitle as string | undefined
    if (customUrl && (typeof customUrl !== "string" || !isValidCustomLinkUrl(customUrl))) {
      return NextResponse.json({ error: "INVALID_CUSTOM_LINK" }, { status: 400 })
    }
    if (customTitle !== undefined && typeof customTitle !== "string") {
      return NextResponse.json({ error: "INVALID_CUSTOM_LINK" }, { status: 400 })
    }
    if (typeof customTitle === "string" && customTitle.length > CUSTOM_LINK_TITLE_MAX) {
      return NextResponse.json({ error: "INVALID_CUSTOM_LINK" }, { status: 400 })
    }
    // Un lien libre sans titre n'a pas de libellé à afficher : les deux vont ensemble.
    if (customUrl && !customTitle?.trim()) {
      return NextResponse.json({ error: "INVALID_CUSTOM_LINK" }, { status: 400 })
    }

    for (const key of Object.keys(socialLinks)) {
      if (!SOCIAL_FIELDS.some((f) => f.key === key) && !CUSTOM_LINK_KEYS.includes(key)) {
        return NextResponse.json({ error: "INVALID_SOCIAL_LINK" }, { status: 400 })
      }
    }
  }

  let imageData: { image: string | null } | undefined
  if (image === null) {
    imageData = { image: null }
  } else if (typeof image === "string") {
    const invalid = await validateImage(image, session.user.id)
    if (invalid) return invalid
    imageData = { image }
  } else if (image !== undefined) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 })
  }

  const [user] = await Promise.all([
    db.user.update({
      where: { id: session.user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...imageData,
      },
      select: { displayName: true, bio: true, image: true },
    }),
    socialLinks !== undefined
      ? db.profile.upsert({
          where: { userId: session.user.id },
          update: { socialLinks },
          create: { userId: session.user.id, socialLinks },
        })
      : Promise.resolve(null),
  ])

  return NextResponse.json(user)
}
