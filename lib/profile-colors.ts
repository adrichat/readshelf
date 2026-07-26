// Lisibilité des textes de la page publique quelle que soit la personnalisation :
// le fond et la couleur d'accent sont choisis librement par l'utilisateur, les
// couleurs de texte sont donc dérivées de leur luminance plutôt que codées en dur.

export interface ProfileFg {
  /** Titres et textes principaux — hex 6 chiffres, suffixable en hex8 */
  heading: string
  /** Texte courant (bio, titres de livres) */
  body: string
  /** Texte secondaire (labels, auteurs) */
  muted: string
  /** Texte discret (footer, placeholders) */
  faint: string
  /** true si le fond est clair (texte sombre) */
  light: boolean
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Luminance relative WCAG (0 = noir, 1 = blanc) ; fallback sombre si invalide */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.05
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(lum1: number, lum2: number): number {
  const [hi, lo] = lum1 >= lum2 ? [lum1, lum2] : [lum2, lum1]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Luminance représentative d'un fond COLOR ou GRADIENT : moyenne des couleurs
 * hex trouvées dans la valeur. Sans hex détecté (image…), on suppose un fond sombre.
 */
export function backgroundLuminance(backgroundValue: string): number {
  const hexes = backgroundValue.match(/#[0-9a-fA-F]{6}/g)
  if (!hexes || hexes.length === 0) return 0.05
  return hexes.reduce((sum, h) => sum + luminance(h), 0) / hexes.length
}

// Point de bascule blanc/noir : en dessous de L≈0.179, le blanc contraste
// mieux que le noir (et inversement) — dérivé de la formule de contraste WCAG.
const FLIP = 0.179

/** Texte posé directement sur une couleur pleine (ex : pastille de filtre active) */
export function readableTextOn(hex: string): string {
  return luminance(hex) >= FLIP ? "#0f172a" : "#ffffff"
}

/** Palette de textes adaptée à la luminance du fond du profil */
export function foregroundFor(bgLuminance: number): ProfileFg {
  const light = bgLuminance >= FLIP
  return light
    ? {
        heading: "#0f172a",
        body: "rgba(15,23,42,0.78)",
        muted: "rgba(15,23,42,0.6)",
        faint: "rgba(15,23,42,0.45)",
        light,
      }
    : {
        heading: "#ffffff",
        body: "rgba(255,255,255,0.75)",
        muted: "rgba(255,255,255,0.58)",
        faint: "rgba(255,255,255,0.4)",
        light,
      }
}

/**
 * L'accent est-il lisible comme couleur de texte sur ce fond ?
 * Sinon, l'appelant retombe sur fg.heading.
 */
export function accentTextColor(accentColor: string, bgLuminance: number, fg: ProfileFg): string {
  return contrastRatio(luminance(accentColor), bgLuminance) >= 2.5 ? accentColor : fg.heading
}
