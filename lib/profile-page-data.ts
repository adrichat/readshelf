import { cache } from "react"
import { db } from "@/lib/db"

// `User.image` (avatar) et `Profile.backgroundValue` (fond GIF) stockent des
// data URL base64 — jusqu'à ~4 Mo et ~6 Mo respectivement (voir les limites
// dans app/api/user/profile/route.ts et app/api/profile/route.ts).
//
// Les inclure dans la requête de page les faisait traverser le réseau depuis
// eu-west-1 *puis* finir inlinés dans le HTML : un document de plusieurs Mo,
// incompressible (base64), non cacheable, bloquant le premier rendu. Et comme
// `generateMetadata` refaisait la même requête, la facture était doublée.
//
// Ici on ne lit jamais ces deux colonnes : la page rend des URL vers
// /api/media/... qui les sert en binaire, cacheable par le CDN et le
// navigateur. On ne remonte que de quoi construire ces URL (présence + version).
const PROFILE_HEADER_SQL = `
  select
    u.id,
    u.username,
    u."displayName",
    u.bio,
    u."isPremium",
    u.image is not null                              as "hasImage",
    -- Les avatars OAuth sont déjà des URL distantes : inutile de les faire
    -- passer par notre route média, on les sert telles quelles.
    case when u.image like 'data:%' then null else u.image end as "remoteImageUrl",
    floor(extract(epoch from u."updatedAt"))::bigint as "userVersion",
    p.id                                             as "profileId",
    p."backgroundType"::text as "backgroundType",
    -- La seule valeur lourde : on ne la remonte que lorsqu'elle est légère
    -- (couleur ou dégradé). Pour un fond image, la page utilise la route média.
    case when p."backgroundType" = 'IMAGE' then null else p."backgroundValue" end as "backgroundValue",
    p."accentColor",
    p."fontFamily",
    p."layoutType"::text as "layoutType",
    p."effectType"::text as "effectType",
    p."shelfColor",
    p."socialLinks",
    p."seoTitle",
    p."seoDescription",
    p."profileViews",
    floor(extract(epoch from p."updatedAt"))::bigint as "profileVersion"
  from "User" u
  left join "Profile" p on p."userId" = u.id
  where u.username = $1
  limit 1
`

export interface ProfileHeader {
  id: string
  username: string
  displayName: string | null
  bio: string | null
  isPremium: boolean
  hasImage: boolean
  remoteImageUrl: string | null
  userVersion: bigint | number
  profileId: string | null
  backgroundType: "COLOR" | "GRADIENT" | "IMAGE" | null
  backgroundValue: string | null
  accentColor: string | null
  fontFamily: string | null
  layoutType: "GRID" | "SHELF" | "MOSAIC" | "LIBRARY" | null
  effectType: "PARTICLES" | "AMBIENT_GLOW" | "NOISE" | null
  shelfColor: string | null
  socialLinks: unknown
  seoTitle: string | null
  seoDescription: string | null
  profileViews: number | null
  profileVersion: bigint | number | null
}

// `cache()` dédoublonne l'appel sur la durée d'un rendu : `generateMetadata` et
// le corps de la page partagent désormais la même requête au lieu d'en faire
// deux (Prisma, contrairement à `fetch`, ne dédoublonne rien tout seul).
export const getProfileHeader = cache(async (username: string): Promise<ProfileHeader | null> => {
  const rows = await db.$queryRawUnsafe<ProfileHeader[]>(PROFILE_HEADER_SQL, username)
  return rows[0] ?? null
})

export interface ProfileBookRow {
  id: string
  status: string
  rating: number | null
  isFavorite: boolean
  bookId: string
  title: string
  authors: string[]
  coverUrl: string | null
  type: string
}

// Jointure sur le username plutôt que sur l'id : la liste des livres peut
// ainsi partir en parallèle de l'en-tête, au lieu d'attendre son `user.id`
// (deux allers-retours séquentiels vers eu-west-1 devenaient un seul).
export const getProfileBooks = cache(async (username: string): Promise<ProfileBookRow[]> => {
  return db.$queryRaw<ProfileBookRow[]>`
    select
      ub.id,
      ub.status::text as status,
      ub.rating,
      ub."isFavorite",
      b.id            as "bookId",
      b.title,
      b.authors,
      b."coverUrl",
      b.type::text    as type
    from "UserBook" ub
    join "User" u on u.id = ub."userId"
    join "Book" b on b.id = ub."bookId"
    where u.username = ${username}
    order by ub."order" asc
  `
})
