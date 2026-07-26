export const SOCIAL_FIELDS = [
  {
    key: "goodreads",
    label: "Goodreads",
    placeholder: "https://www.goodreads.com/user/show/...",
    hosts: ["goodreads.com"],
  },
  {
    key: "babelio",
    label: "Babelio",
    placeholder: "https://www.babelio.com/monprofil.php...",
    hosts: ["babelio.com"],
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://www.instagram.com/ton_compte",
    hosts: ["instagram.com"],
  },
  {
    key: "booknode",
    label: "Booknode",
    placeholder: "https://booknode.com/profil/...",
    hosts: ["booknode.com"],
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://www.youtube.com/@ta_chaine",
    hosts: ["youtube.com", "youtu.be"],
  },
  {
    key: "spotify",
    label: "Spotify",
    placeholder: "https://open.spotify.com/user/...",
    hosts: ["open.spotify.com"],
  },
] as const

export type SocialKey = (typeof SOCIAL_FIELDS)[number]["key"]

export const CUSTOM_LINK_TITLE_MAX = 30

// Ajoute https:// si l'utilisateur a tapé l'URL sans protocole
export function normalizeSocialUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Vérifie que l'URL pointe bien vers le domaine attendu pour ce réseau,
// avec un chemin qui ressemble à un vrai identifiant de profil (pas de
// slashs redondants, d'espaces ou de caractères imprévus)
export function isValidSocialUrl(key: string, value: string): boolean {
  const field = SOCIAL_FIELDS.find((f) => f.key === key)
  if (!field) return false
  if (/\s/.test(value)) return false

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false

  const host = url.hostname.toLowerCase().replace(/^www\./, "")
  if (!field.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return false

  // pathname commence toujours par "/" : on isole les segments réels
  const segments = url.pathname.split("/").slice(1)
  if (segments[segments.length - 1] === "") segments.pop() // slash de fin toléré
  if (segments.length === 0) return false
  // "@" toléré pour les handles YouTube (@ta_chaine)
  return segments.every((seg) => /^[a-zA-Z0-9@._-]+$/.test(seg))
}

// Construit le deep link natif (custom URI scheme) d'une app quand elle en
// expose un de façon fiable. Renvoie null pour les réseaux qui n'en ont pas
// (Goodreads, Babelio, Booknode, YouTube) : ceux-là s'appuient uniquement
// sur les Universal/App Links natifs du téléphone, hors de notre contrôle.
export function getAppDeepLink(key: string, url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const segments = parsed.pathname.split("/").filter(Boolean)
  if (segments.length === 0) return null

  if (key === "instagram") {
    const handle = segments[0].replace(/^@/, "")
    return `instagram://user?username=${encodeURIComponent(handle)}`
  }

  if (key === "spotify") {
    // Mapping officiel Spotify : https://open.spotify.com/user/xxx -> spotify:user:xxx
    return `spotify:${segments.join(":")}`
  }

  return null
}

// Lien libre : n'importe quel domaine, mais on garde un protocole strict
// (http/https) pour éviter les URI javascript:/data: dans un href cliquable.
export function isValidCustomLinkUrl(value: string): boolean {
  if (/\s/.test(value)) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return url.protocol === "https:" || url.protocol === "http:"
}
