import { notFound } from "next/navigation"
import Link from "next/link"
import { Playfair_Display, Merriweather, Crimson_Text } from "next/font/google"
import { db } from "@/lib/db"
import { accentTextColor, backgroundLuminance, foregroundFor } from "@/lib/profile-colors"
import { SOCIAL_FIELDS, isValidSocialUrl, isValidCustomLinkUrl, getAppDeepLink, type SocialKey } from "@/lib/social-links"
import { CoverViewerProvider } from "@/components/profile/CoverViewer"
import { FavoriteBooks } from "@/components/profile/FavoriteBooks"
import { ProfileBooks } from "@/components/profile/ProfileBooks"
import { ProfileEffects } from "@/components/profile/ProfileEffects"
import { PromoPopup } from "@/components/profile/PromoPopup"
import { SocialLink } from "@/components/profile/SocialLink"
import { SocialIcon, CustomLinkIcon } from "@/components/profile/SocialIcon"
import type { Metadata } from "next"

const playfair = Playfair_Display({ subsets: ["latin"] })
const merriweather = Merriweather({ subsets: ["latin"], weight: ["300", "400", "700"] })
const crimson = Crimson_Text({ subsets: ["latin"], weight: ["400", "600", "700"] })

const FONT_CLASSES: Record<string, string> = {
  playfair: playfair.className,
  merriweather: merriweather.className,
  crimson: crimson.className,
}

// Réseaux moins reconnaissables au seul logo : on garde le nom à côté de
// l'icône. Instagram/YouTube/Spotify restent en icône seule (identifiables
// sans texte).
const SOCIAL_KEYS_WITH_LABEL = new Set<SocialKey>(["goodreads", "babelio", "booknode"])

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await db.user.findUnique({
    where: { username },
    include: { profile: true },
  })
  if (!user) return {}

  return {
    title: user.profile?.seoTitle ?? `${user.displayName ?? username} — ReadShelf`,
    description: user.profile?.seoDescription ?? user.bio ?? `La bibliothèque de ${user.displayName ?? username}`,
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  const user = await db.user.findUnique({
    where: { username },
    include: {
      profile: true,
      userBooks: {
        include: { book: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!user) notFound()

  db.profile
    .update({ where: { userId: user.id }, data: { profileViews: { increment: 1 } } })
    .catch(() => {})

  const profile = user.profile
  const bgType = profile?.backgroundType ?? "COLOR"
  const bgValue = profile?.backgroundValue ?? "#0a0a0a"
  const accentColor = profile?.accentColor ?? "#d97706"

  // Options premium — appliquées uniquement si le compte l'est
  // (les anciennes valeurs SHELF/MOSAIC retombent sur la grille)
  const layout: "GRID" | "LIBRARY" =
    user.isPremium && profile?.layoutType === "LIBRARY" ? "LIBRARY" : "GRID"
  const shelfColor = profile?.shelfColor ?? "#7a4518"
  const fontClass = user.isPremium ? FONT_CLASSES[profile?.fontFamily ?? ""] ?? "" : ""
  const effect = user.isPremium ? profile?.effectType ?? null : null

  // Le fond gif est premium — un compte redevenu gratuit retombe sur la couleur
  const hasImageBackground = bgType === "IMAGE" && user.isPremium
  const backgroundStyle = hasImageBackground
    ? {
        backgroundImage: `url(${bgValue})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : bgType === "GRADIENT"
      ? { backgroundImage: bgValue }
      : { backgroundColor: bgValue }

  // Couleurs de texte dérivées du fond pour rester lisibles sur fond clair
  // comme sombre ; l'accent retombe sur la couleur de titre s'il se fond dans le décor
  const bgLum = backgroundLuminance(bgValue)
  const fg = foregroundFor(bgLum)
  const accentText = accentTextColor(accentColor, bgLum, fg)

  // Livres favoris (max 4)
  const favoriteBooks = user.userBooks
    .filter((ub) => ub.isFavorite)
    .slice(0, 4)
    .map((ub) => ({
      id: ub.book.id,
      title: ub.book.title,
      authors: ub.book.authors,
      coverUrl: ub.book.coverUrl,
    }))

  // Les favoris ont déjà leur section dédiée plus haut : on les exclut d'ici
  // pour ne pas les afficher deux fois sur le profil
  const allBooks = user.userBooks
    .filter((ub) => !ub.isFavorite)
    .map((ub) => ({
      id: ub.id,
      status: ub.status,
      rating: ub.rating,
      book: {
        title: ub.book.title,
        authors: ub.book.authors,
        coverUrl: ub.book.coverUrl,
        type: ub.book.type as string,
      },
    }))

  const totalBooks = user.userBooks.length
  const readingCount = user.userBooks.filter((b) => b.status === "READING").length
  const readCount = user.userBooks.filter((b) => b.status === "READ").length
  const displayName = user.displayName ?? username
  const socialLinks = (profile?.socialLinks ?? {}) as Record<string, string>

  // Réseaux avec logo + nom groupés avant ceux en icône seule, pour ne pas
  // les faire alterner dans la rangée.
  const activeSocials = SOCIAL_FIELDS.filter(
    (s) => socialLinks[s.key] && isValidSocialUrl(s.key, socialLinks[s.key])
  ).sort((a, b) => {
    const aLabeled = SOCIAL_KEYS_WITH_LABEL.has(a.key) ? 0 : 1
    const bLabeled = SOCIAL_KEYS_WITH_LABEL.has(b.key) ? 0 : 1
    return aLabeled - bLabeled
  })
  const hasCustomLink =
    !!socialLinks.customLinkUrl &&
    !!socialLinks.customLinkTitle &&
    isValidCustomLinkUrl(socialLinks.customLinkUrl)

  return (
    <div className={`relative isolate min-h-screen ${fontClass}`}>
      {/* Le décor vit dans une couche fixe plutôt que sur le conteneur qui
          défile : background-attachment: fixed est ignoré par Safari iOS, et
          un dégradé posé sur le conteneur s'étire sur toute la hauteur du
          document (donc défile). Ici le fond reste calé sur le viewport,
          immobile au scroll, quel que soit son type. */}
      <div className="viewport-layer -z-20 pointer-events-none" aria-hidden style={backgroundStyle} />
      {hasImageBackground && (
        <div className="viewport-layer -z-10 pointer-events-none" aria-hidden style={{ backgroundColor: "rgba(0,0,0,0.35)" }} />
      )}
      {effect && (
        <ProfileEffects
          effect={effect}
          accentColor={accentColor}
          // profileViews s'incrémente à chaque visite : nouvelle répartition
          // de particules à chaque chargement, sans impureté au rendu
          seed={profile?.profileViews ?? 0}
        />
      )}

      {/* Hero header avec dégradé en couleur d'accent */}
      <div
        className="relative overflow-hidden pt-12 pb-9 sm:pt-20 sm:pb-16"
        style={{
          background: `linear-gradient(180deg, ${accentColor}22 0%, ${accentColor}08 60%, transparent 100%)`,
        }}
      >
        {/* Blob décoratif */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[760px] h-[380px] rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${accentColor}12` }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
          {/* Avatar */}
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={displayName}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full mb-6 object-cover"
              style={{ boxShadow: `0 0 0 3px ${accentText}60, 0 8px 24px ${accentColor}30` }}
            />
          ) : (
            <div
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full mb-6 flex items-center justify-center text-4xl sm:text-5xl font-bold"
              style={{
                background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                boxShadow: `0 0 0 2px ${accentText}40`,
                color: accentText,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Nom */}
          <h1 className="text-4xl sm:text-5xl font-bold mb-1.5" style={{ color: fg.heading }}>{displayName}</h1>
          <p className="text-base sm:text-lg mb-4" style={{ color: `${accentText}99` }}>
            @{username}
          </p>

          {/* Badge premium */}
          {user.isPremium && (
            <Link
              href="/dashboard/premium"
              className="text-sm px-4 py-1.5 rounded-full mb-5 inline-block hover:opacity-75 transition-opacity"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentText,
                border: `1px solid ${accentText}35`,
              }}
            >
              ✦ Lecteur Premium
            </Link>
          )}

          {/* Bio */}
          {user.bio && (
            <p className="text-base sm:text-lg max-w-xl leading-relaxed mb-6" style={{ color: fg.body }}>{user.bio}</p>
          )}

          {/* Liens sociaux */}
          {(activeSocials.length > 0 || hasCustomLink) && (
            <div className="flex items-center gap-3 sm:gap-3.5 flex-wrap justify-center mb-7">
              {activeSocials.map((s) => {
                const showLabel = SOCIAL_KEYS_WITH_LABEL.has(s.key)
                return (
                  <SocialLink
                    key={s.key}
                    href={socialLinks[s.key]}
                    appHref={getAppDeepLink(s.key, socialLinks[s.key])}
                    className={
                      showLabel
                        ? "flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-5 rounded-full border transition-all hover:scale-105 text-sm font-medium"
                        : "flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full border transition-all hover:scale-110"
                    }
                    style={{
                      borderColor: `${accentText}40`,
                      color: accentText,
                      backgroundColor: `${accentColor}10`,
                    }}
                    title={s.label}
                    aria-label={s.label}
                  >
                    <SocialIcon social={s.key} className="w-5 h-5 sm:w-[22px] sm:h-[22px] shrink-0" />
                    {showLabel && <span>{s.label}</span>}
                  </SocialLink>
                )
              })}
              {hasCustomLink && (
                <a
                  href={socialLinks.customLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full border transition-all hover:scale-110"
                  style={{
                    borderColor: `${accentText}40`,
                    color: accentText,
                    backgroundColor: `${accentColor}10`,
                  }}
                  title={socialLinks.customLinkTitle}
                  aria-label={socialLinks.customLinkTitle}
                >
                  <CustomLinkIcon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                </a>
              )}
            </div>
          )}

          {/* Stats */}
          {totalBooks > 0 && (
            <div className="flex items-center justify-center flex-wrap gap-x-10 gap-y-5 sm:gap-x-16">
              <div className="text-center">
                <span className="block text-3xl sm:text-4xl font-bold" style={{ color: fg.heading }}>{totalBooks}</span>
                <span className="text-sm" style={{ color: fg.muted }}>📚 livre{totalBooks !== 1 ? "s" : ""}</span>
              </div>
              {readingCount > 0 && (
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-bold" style={{ color: fg.heading }}>{readingCount}</span>
                  <span className="text-sm" style={{ color: fg.muted }}>📖 en cours</span>
                </div>
              )}
              {readCount > 0 && (
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-bold" style={{ color: fg.heading }}>{readCount}</span>
                  <span className="text-sm" style={{ color: fg.muted }}>✅ lu{readCount !== 1 ? "s" : ""}</span>
                </div>
              )}
              {profile && profile.profileViews > 0 && (
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-bold" style={{ color: fg.heading }}>{profile.profileViews}</span>
                  <span className="text-sm" style={{ color: fg.muted }}>👁️ vue{profile.profileViews !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bibliothèque */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
        {/* Le survol n'existe pas au doigt : sous CoverViewerProvider, taper
            une couverture l'ouvre en grand, ou le pouce la fait pivoter */}
        <CoverViewerProvider accentColor={accentColor}>
          {/* Livres favoris Letterboxd-style */}
          <FavoriteBooks books={favoriteBooks} accentColor={accentColor} accentText={accentText} fg={fg} />

          {allBooks.length > 0 ? (
            <ProfileBooks books={allBooks} accentColor={accentColor} layout={layout} shelfColor={shelfColor} fg={fg} />
          ) : totalBooks === 0 ? (
            <div className="text-center py-28">
              <div className="text-6xl mb-5">📚</div>
              <p className="text-lg" style={{ color: fg.muted }}>Cette bibliothèque est encore vide.</p>
              <p className="text-sm mt-2" style={{ color: fg.faint }}>Reviens plus tard !</p>
            </div>
          ) : null}
        </CoverViewerProvider>
      </div>

      <footer className="pb-10 text-center">
        <Link
          href="/"
          className="text-xs transition-opacity hover:opacity-60"
          style={{ color: fg.faint }}
        >
          Créé avec ReadShelf ✦
        </Link>
      </footer>

      <PromoPopup accentColor={accentColor} />
    </div>
  )
}
