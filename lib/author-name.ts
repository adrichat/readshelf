// Tri par auteur : on classe sur le nom de famille, pas sur le prénom.
// Les API renvoient les auteurs en ordre naturel ("Ursula K. Le Guin") ou,
// plus rarement, déjà inversés ("Le Guin, Ursula K.").

// Particules nobiliaires / patronymiques. Elles ne sont conservées dans le nom
// de famille que lorsqu'elles sont capitalisées : c'est la convention de
// classement française comme anglo-saxonne ("Simone de Beauvoir" se classe à B,
// "Ursula K. Le Guin" à L, "Ludwig van Beethoven" à B, "Vincent Van Gogh" à V).
const PARTICLES = new Set([
  "de", "du", "des", "da", "das", "dos", "del", "della", "di", "la", "le", "les",
  "van", "von", "der", "den", "ter", "ten", "af", "av", "bin", "ibn", "al", "el",
])

// Suffixes générationnels : ils ne font pas partie du nom de famille.
const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"])

// Extrait le nom de famille d'un auteur tel que renvoyé par les API livres.
// Renvoie la chaîne entière quand elle n'est pas un nom de personne
// ("Collectif", "Homère", un nom d'éditeur…) : rien à découper dans ce cas.
export function familyName(author: string): string {
  const name = author.replace(/\s+/g, " ").trim()
  if (!name) return ""

  // Format « Nom, Prénom » : le nom de famille est déjà en tête.
  const comma = name.indexOf(",")
  if (comma > 0) return name.slice(0, comma).trim()

  const tokens = name.split(" ")
  // Un nom tout en majuscules ne permet pas de distinguer « de » de « De » :
  // on accepte alors les particules quelle que soit leur casse.
  const allCaps = name === name.toUpperCase()

  let end = tokens.length
  while (end > 1 && SUFFIXES.has(tokens[end - 1].toLowerCase())) end--

  let start = end - 1
  while (start > 0) {
    const prev = tokens[start - 1]
    if (!PARTICLES.has(prev.toLowerCase())) break
    if (!allCaps && prev[0] === prev[0].toLowerCase()) break
    start--
  }

  return tokens.slice(start, end).join(" ")
}

const collate = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" })

// Comparateur de tri : nom de famille d'abord, puis nom complet pour départager
// deux homonymes de famille ("Dumas, Alexandre" avant "Dumas, Claude").
export function compareAuthors(a: string, b: string): number {
  return collate(familyName(a), familyName(b)) || collate(a, b)
}
