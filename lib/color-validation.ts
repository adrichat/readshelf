// Validation stricte des couleurs stockées en base et réinjectées telles
// quelles dans des attributs `style` de la page publique — sans ça, un champ
// de type texte accepterait n'importe quelle chaîne (ex: `red) url(...)` pour
// casser le rendu CSS, ou simplement des valeurs qui plantent le calcul de
// luminance côté profil public).

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

// Format exact généré par `buildGradient()` côté client (appearance/page.tsx)
const GRADIENT_RE = /^linear-gradient\(160deg, #[0-9a-fA-F]{6} 0%, #[0-9a-fA-F]{6} 100%\)$/

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value)
}

export function isValidGradientValue(value: unknown): value is string {
  return typeof value === "string" && GRADIENT_RE.test(value)
}

/** Fond COLOR ou GRADIENT — le type IMAGE (gif) a sa propre validation dédiée */
export function isValidSolidOrGradientBackground(type: "COLOR" | "GRADIENT", value: unknown): value is string {
  return type === "COLOR" ? isValidHexColor(value) : isValidGradientValue(value)
}
