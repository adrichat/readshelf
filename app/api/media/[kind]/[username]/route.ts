import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Sert les images stockées en data URL base64 (avatar, fond de profil) comme
// de vraies réponses binaires cacheables, au lieu de les inliner dans le HTML
// de la page — c'était la cause principale de documents à plusieurs Mo.
//
// L'URL porte une version (`?v=<timestamp updatedAt>`) : le contenu d'une
// version donnée est immuable, donc on peut le laisser en cache un an. Une
// modification d'avatar change `updatedAt`, donc l'URL, donc le cache.

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+=*)$/

type Kind = "avatar" | "background"

interface Props {
  params: Promise<{ kind: string; username: string }>
}

export async function GET(request: Request, { params }: Props) {
  const { kind, username } = await params

  if (kind !== "avatar" && kind !== "background") {
    return new NextResponse("Not found", { status: 404 })
  }

  const dataUrl = await loadDataUrl(kind, username)
  if (!dataUrl) {
    return new NextResponse("Not found", { status: 404 })
  }

  const m = dataUrl.match(DATA_URL_RE)
  if (!m) {
    // Valeur qui n'est pas une image base64 (couleur, dégradé, URL distante) :
    // rien à servir ici.
    return new NextResponse("Not found", { status: 404 })
  }

  const [, mime, b64] = m
  const body = Buffer.from(b64, "base64")

  // L'ETag inclut la version demandée : la taille seule ferait répondre 304
  // à un client qui a en cache une image remplacée par une autre de longueur
  // identique.
  const version = new URL(request.url).searchParams.get("v")
  const etag = `W/"${kind}-${username}-${version ?? "nov"}-${body.byteLength}"`
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } })
  }

  const versioned = version !== null

  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(body.byteLength),
      ETag: etag,
      // Avec version dans l'URL le contenu est immuable ; sans version on
      // laisse le CDN revalider régulièrement.
      "Cache-Control": versioned
        ? "public, max-age=31536000, s-maxage=31536000, immutable"
        : "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}

async function loadDataUrl(kind: Kind, username: string): Promise<string | null> {
  if (kind === "avatar") {
    const user = await db.user.findUnique({
      where: { username },
      select: { image: true },
    })
    return user?.image ?? null
  }

  const rows = await db.$queryRaw<{ backgroundValue: string | null }[]>`
    select p."backgroundValue"
    from "Profile" p
    join "User" u on u.id = p."userId"
    where u.username = ${username} and p."backgroundType" = 'IMAGE'
    limit 1
  `
  return rows[0]?.backgroundValue ?? null
}
