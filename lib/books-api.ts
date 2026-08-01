export interface BookSearchResult {
  id: string
  title: string
  authors: string[]
  coverUrl: string | null
  publishYear: number | null
  isbn: string | null
  openLibraryId: string | null
  googleBooksId: string | null
  language: string | null
  type: "NOVEL" | "MANGA" | "COMIC"
}

const FIELDS = "items(id,volumeInfo(title,authors,publishedDate,imageLinks,industryIdentifiers,language))"
const MAX_RESULTS = 20

// Cache mémoire courte durée : évite de re-frapper l'API pour la même requête
// (frappe répétées en dev, retype de la même recherche, etc.). Borné en taille
// (éviction FIFO via l'ordre d'insertion de la Map) pour ne pas croître sans limite.
const cache = new Map<string, { at: number; results: BookSearchResult[] }>()
const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 200

export function normalizeCacheKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ")
}

function buildUrl(q: string, apiKey: string, langRestrict?: string) {
  const encoded = encodeURIComponent(q)
  // langRestrict n'est utilisé que pour l'appel complémentaire "éditions françaises" :
  // appliqué partout, il serait trop restrictif (coupe les mangas/livres dont Google
  // n'a pas indexé la langue).
  // country=FR : sans ce paramètre, Google tente de géolocaliser l'appelant via son IP pour la
  // vérification de disponibilité, et échoue souvent silencieusement sur des IP de serveur/datacenter
  // (renvoie alors 503 "backendFailed" au lieu d'un vrai résultat).
  const lang = langRestrict ? `&langRestrict=${langRestrict}` : ""
  return `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=${MAX_RESULTS}&printType=books&country=FR${lang}&key=${apiKey}&fields=${FIELDS}`
}

const RETRYABLE_DELAYS_MS = [300, 900]

async function fetchVolumes(url: string): Promise<Record<string, unknown>[] | null> {
  for (let attempt = 0; attempt <= RETRYABLE_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: 300 } })
      if (res.ok) {
        const data = await res.json()
        return (data.items ?? []) as Record<string, unknown>[]
      }
      // 503 "backendFailed" est documenté par Google comme transitoire : on retente.
      // 429/4xx ne se résoudra pas en retentant immédiatement, on abandonne tout de suite.
      const shouldRetry = res.status >= 500 && attempt < RETRYABLE_DELAYS_MS.length
      console.error(`[books-api] Google Books a répondu ${res.status} pour ${url.replace(/key=[^&]+/, "key=***")}`)
      if (!shouldRetry) return null
      await new Promise((r) => setTimeout(r, RETRYABLE_DELAYS_MS[attempt]))
    } catch (err) {
      console.error("[books-api] échec de la requête vers Google Books:", err)
      return null
    }
  }
  return null
}

// Fusionne les résultats des deux appels avec tolérance de panne partielle :
// si un seul des deux appels a échoué, on sert quand même les résultats de l'autre.
// Les items de l'appel restreint FR passent en premier ; déduplication par id de
// volume (la position FR gagne). L'ordre de pertinence Google est préservé dans
// chaque groupe. Les ISBN dupliqués sur des volumes différents sont conservés :
// ce sont des éditions distinctes légitimes.
export function mergeVolumes(
  frItems: Record<string, unknown>[] | null,
  allItems: Record<string, unknown>[] | null
): Record<string, unknown>[] | null {
  if (frItems === null && allItems === null) return null
  if (frItems === null) return allItems
  if (allItems === null) return frItems
  const seen = new Set(frItems.map((it) => it.id as string))
  return [...frItems, ...allItems.filter((it) => !seen.has(it.id as string))]
}

export function mapVolume(item: Record<string, unknown>): BookSearchResult {
  const vi = (item.volumeInfo ?? {}) as Record<string, unknown>
  const imageLinks = vi.imageLinks as Record<string, string> | undefined
  const identifiers = (vi.industryIdentifiers as { type: string; identifier: string }[] | undefined) ?? []
  const isbn =
    identifiers.find((i) => i.type === "ISBN_13")?.identifier ??
    identifiers.find((i) => i.type === "ISBN_10")?.identifier ??
    null

  let coverUrl: string | null = null
  const thumb = imageLinks?.thumbnail ?? imageLinks?.smallThumbnail
  if (thumb) {
    // zoom=1 tel quel : demander zoom=2 fait souvent renvoyer à Google un placeholder
    // "image not available" (en HTTP 200, donc indétectable côté client) même quand
    // la vignette zoom=1 existe. La montée en résolution se fait uniquement à
    // l'ajout, via des sources vérifiées (findBestCoverUrl).
    coverUrl = thumb.replace("http://", "https://")
  } else if (isbn) {
    // Beaucoup de volumes Google n'ont pas de pochette alors qu'Open Library en a
    // une pour le même ISBN. ?default=false : si OL n'a pas la couverture non plus,
    // l'URL renvoie 404 (au lieu d'un GIF 1×1 invisible), ce qui déclenche le
    // onError côté client et laisse apparaître le placeholder.
    coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`
  }

  const dateStr = vi.publishedDate as string | undefined
  const publishYear = dateStr ? parseInt(dateStr.substring(0, 4), 10) || null : null
  const language = (vi.language as string | undefined)?.toLowerCase() ?? null

  return {
    id: `gb_${item.id as string}`,
    title: (vi.title as string) ?? "Sans titre",
    authors: (vi.authors as string[]) ?? [],
    coverUrl,
    publishYear,
    isbn,
    openLibraryId: null,
    googleBooksId: item.id as string,
    language,
    type: "NOVEL" as const,
  }
}

// ---------------------------------------------------------------------------
// Open Library : source complémentaire de Google Books. L'index de Google a des
// trous notables sur l'édition française (ex. les livres de Monsieur Toussaint
// Louverture comme "La Maison des Feuilles" en sont totalement absents, même par
// ISBN) ; Open Library les référence. Inversement, Google est meilleur sur les
// mangas et parutions récentes. On interroge donc les deux et on fusionne.
// ---------------------------------------------------------------------------

const OL_FIELDS =
  "key,title,author_name,first_publish_year,cover_i,editions,editions.key,editions.title,editions.language,editions.isbn,editions.cover_i,editions.publish_date"

// Open Library utilise les codes langue MARC (3 lettres) ; on ne mappe que les
// codes connus — un code inconnu donne null (pas de badge) plutôt qu'un code faux.
const OL_LANG_TO_ISO: Record<string, string> = {
  fre: "fr", eng: "en", jpn: "ja", spa: "es", ger: "de", deu: "de", ita: "it",
  por: "pt", rus: "ru", ara: "ar", chi: "zh", kor: "ko", dut: "nl", pol: "pl",
}

type OlDoc = {
  key?: string
  title?: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  editions?: { docs?: OlEditionDoc[] }
}

type OlEditionDoc = {
  key?: string
  title?: string
  language?: string[]
  isbn?: string[]
  cover_i?: number
  publish_date?: string | string[]
}

// Convertit un doc de résultat Open Library (une œuvre + son édition préférée,
// choisie par le paramètre lang=fr) vers le format commun. Renvoie null pour les
// docs inexploitables (sans titre).
export function mapOpenLibraryDoc(doc: OlDoc): BookSearchResult | null {
  const edition = doc.editions?.docs?.[0]
  const title = edition?.title ?? doc.title
  if (!title) return null

  const key = edition?.key ?? doc.key
  const olId = key?.split("/").pop() ?? null
  if (!olId) return null

  const isbns = edition?.isbn ?? []
  const isbn = isbns.find((i) => i.length === 13) ?? isbns[0] ?? null

  const coverId = edition?.cover_i ?? doc.cover_i ?? null
  // cover_i vient de l'index Open Library : la couverture existe, l'URL par id
  // est fiable (pas besoin de la revalider comme les URLs par ISBN).
  const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null

  const rawDate = Array.isArray(edition?.publish_date) ? edition.publish_date[0] : edition?.publish_date
  const yearMatch = rawDate?.match(/\d{4}/)?.[0]
  const publishYear = yearMatch ? parseInt(yearMatch, 10) : doc.first_publish_year ?? null

  const marcLang = edition?.language?.[0]?.toLowerCase() ?? null
  const language = marcLang ? OL_LANG_TO_ISO[marcLang] ?? null : null

  return {
    id: `ol_${olId}`,
    title,
    authors: doc.author_name ?? [],
    coverUrl,
    publishYear,
    isbn,
    openLibraryId: olId,
    googleBooksId: null,
    language,
    type: "NOVEL" as const,
  }
}

// null = échec de l'appel (tolérance de panne partielle, comme fetchVolumes).
async function fetchOpenLibrary(query: string): Promise<BookSearchResult[] | null> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&lang=fr&limit=${MAX_RESULTS}&fields=${OL_FIELDS}`
  try {
    // Open Library peut être lent : on borne pour ne pas retenir toute la recherche.
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 300 } })
    if (!res.ok) {
      console.error(`[books-api] Open Library a répondu ${res.status} pour ${url}`)
      return null
    }
    const data = await res.json()
    const docs = (data.docs ?? []) as OlDoc[]
    return docs.map(mapOpenLibraryDoc).filter((r): r is BookSearchResult => r !== null)
  } catch (err) {
    console.error("[books-api] échec de la requête vers Open Library:", err)
    return null
  }
}

// Fusionne les résultats Open Library derrière ceux de Google, en écartant les
// doublons : même ISBN, ou même couple titre+premier auteur (comparaison
// insensible à la casse et aux accents). Le classement final (rankResults) fera
// remonter les bons résultats quelle que soit leur source.
export function combineSources(primary: BookSearchResult[], secondary: BookSearchResult[]): BookSearchResult[] {
  const seenIsbn = new Set(primary.map((r) => r.isbn).filter(Boolean))
  const titleAuthorKey = (r: BookSearchResult) =>
    `${normalizeForMatch(r.title)}|${normalizeForMatch(r.authors[0] ?? "")}`
  const seenTitleAuthor = new Set(primary.map(titleAuthorKey))
  const extra = secondary.filter(
    (r) => !(r.isbn && seenIsbn.has(r.isbn)) && !seenTitleAuthor.has(titleAuthorKey(r))
  )
  return [...primary, ...extra]
}

// Pour la comparaison titre/requête uniquement : insensible à la casse et aux accents.
function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
}

// Classement final : éditions françaises d'abord, puis — dans chaque groupe de
// langue — correspondance sur l'auteur, puis sur le titre. Ces critères compensent
// le AND implicite de la recherche libre Google : sur des titres français pleins
// de mots courants ("la", "de"...), le livre qui matche exactement peut se
// retrouver noyé sous des résultats qui ne matchent que la description.
// L'auteur pèse plus lourd que le titre : pour une recherche "guillaume musso",
// les romans de Musso doivent précéder les fiches de lecture dont le TITRE
// contient "…de Guillaume Musso". Le tri est stable : à critères égaux, l'ordre
// de pertinence renvoyé par la source est préservé. Volontairement pas de bonus
// "a une couverture" : la pertinence prime.
export function rankResults(results: BookSearchResult[], query: string): BookSearchResult[] {
  const q = normalizeForMatch(query)
  const score = (r: BookSearchResult) => {
    if (!q) return r.language === "fr" ? 4 : 0
    const authorMatch = r.authors.some((a) => normalizeForMatch(a).includes(q))
    const titleMatch = normalizeForMatch(r.title).includes(q)
    return (r.language === "fr" ? 4 : 0) + (authorMatch ? 2 : 0) + (titleMatch ? 1 : 0)
  }
  return [...results].sort((a, b) => score(b) - score(a)).slice(0, MAX_RESULTS)
}

// includeOpenLibrary=false : mode "rapide" (Google seul, réponse en <1 s) que la
// modal affiche immédiatement, pendant qu'une seconde requête en mode complet
// (Google + Open Library, 2-4 s à cause de la latence d'Open Library) vient
// enrichir la liste. Les deux modes ont des entrées de cache distinctes.
export async function searchBooks(
  query: string,
  { includeOpenLibrary = true }: { includeOpenLibrary?: boolean } = {}
): Promise<BookSearchResult[]> {
  const normalized = normalizeCacheKey(query)
  if (normalized.length === 0) return []
  const cacheKey = `${includeOpenLibrary ? "full" : "quick"}:${normalized}`

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.results
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  if (!apiKey) {
    console.error("[books-api] GOOGLE_BOOKS_API_KEY manquante — la recherche est désactivée. Ajoutez-la dans .env.")
    throw new Error("missing_api_key")
  }

  // Trois appels en parallèle, en recherche libre (l'opérateur intitle:"..." en
  // phrase exacte cassait les recherches par auteur et les titres partiels) :
  // - Google restreint au français : fait ressortir les éditions françaises de
  //   façon fiable et règle le "noyage" des titres pleins de mots courants ;
  // - Google toutes langues : garde visibles les livres sans édition FR référencée ;
  // - Open Library (lang=fr) : comble les trous de l'index Google sur l'édition
  //   française (voir le bloc Open Library plus haut).
  const [frItems, allItems, olResults] = await Promise.all([
    fetchVolumes(buildUrl(query, apiKey, "fr")),
    fetchVolumes(buildUrl(query, apiKey)),
    // En mode rapide, null (= "pas de résultat OL") pour que l'échec des deux
    // appels Google reste détecté comme un échec total ci-dessous.
    includeOpenLibrary ? fetchOpenLibrary(query) : Promise.resolve(null),
  ])

  const gbMerged = mergeVolumes(frItems, allItems)
  if (gbMerged === null && olResults === null) {
    // Toutes les sources ont échoué (après retries) : on remonte l'erreur (→ 502
    // côté route) sans la mettre en cache, pour permettre un retry rapide client.
    throw new Error("search_sources_unavailable")
  }

  const combined = combineSources((gbMerged ?? []).map(mapVolume), olResults ?? [])
  const final = rankResults(combined, query)

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(cacheKey, { at: Date.now(), results: final })
  return final
}

// Vérifie qu'une URL d'image Google répond par une vraie jaquette : les placeholders
// "image not available" sont systématiquement servis en image/png, les vraies
// couvertures en image/jpeg. On lit uniquement les en-têtes, pas le corps.
async function isRealGoogleImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    const contentType = res.headers.get("content-type") ?? ""
    res.body?.cancel().catch(() => {})
    return res.ok && contentType.includes("image/jpeg")
  } catch (err) {
    console.error("[books-api] échec de vérification d'une image Google:", err)
    return false
  }
}

// Meilleure couverture disponible pour un livre au moment de son ajout, par ordre
// de fiabilité décroissante. Coûte quelques requêtes réseau : à réserver à l'ajout
// effectif d'un livre, pas aux résultats de recherche.
export async function findBestCoverUrl(book: {
  coverUrl?: string | null
  googleBooksId?: string | null
  isbn?: string | null
}): Promise<string | null> {
  const { coverUrl, googleBooksId, isbn } = book

  // 1. Agrandissement fife sur la vignette Google : fife=wN redimensionne depuis
  //    l'image source en plafonnant à la résolution réellement disponible, et ne
  //    renvoie jamais le placeholder que servent les niveaux de zoom absents
  //    (contrairement à zoom=2/3/4). Gratuit en quota : ce n'est pas un appel API.
  if (coverUrl?.includes("books.google.com/books/")) {
    const fifeUrl = `${coverUrl}&fife=w800`
    if (await isRealGoogleImage(fifeUrl)) return fifeUrl
  }

  // 2. Liens HD du détail du volume (large/medium/small), réels quand présents.
  if (googleBooksId) {
    const hd = await getHighResCoverUrl(googleBooksId)
    if (hd) return hd
  }

  // 2bis. Couverture Open Library par id (résultat de la recherche Open Library) :
  //    on garde le même visuel en grande taille. L'id venant de l'index OL, la
  //    couverture existe ; on vérifie quand même la variante -L par prudence.
  const olIdMatch = coverUrl?.match(/^https:\/\/covers\.openlibrary\.org\/b\/id\/(\d+)-[SM]\.jpg/)
  if (olIdMatch) {
    const largeUrl = `https://covers.openlibrary.org/b/id/${olIdMatch[1]}-L.jpg?default=false`
    try {
      const res = await fetch(largeUrl, { method: "HEAD" })
      if (res.ok) return largeUrl
    } catch (err) {
      console.error("[books-api] échec de vérification de la couverture Open Library:", err)
    }
    // La -M d'origine reste fiable (id issu de l'index) si la vérification -L échoue.
    return coverUrl ?? null
  }

  // 3. Couverture Open Library vérifiée par ISBN (qualité variable, mais réelle).
  if (isbn) {
    const ol = await findOpenLibraryCover(isbn, "L")
    if (ol) return ol
  }

  // 4. Vignette de la recherche telle quelle (zoom=1, toujours réelle) — sauf si
  //    c'est une URL Open Library non vérifiée, qui peut renvoyer 404.
  if (coverUrl && !coverUrl.startsWith("https://covers.openlibrary.org/")) {
    return coverUrl
  }
  return null
}

// Vérifie qu'Open Library possède réellement une couverture pour cet ISBN :
// avec ?default=false, l'URL renvoie 404 quand la couverture n'existe pas, donc
// un simple HEAD suffit à valider avant de stocker l'URL en base.
export async function findOpenLibraryCover(isbn: string, size: "S" | "M" | "L" = "L"): Promise<string | null> {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`
  try {
    const res = await fetch(url, { method: "HEAD" })
    return res.ok ? url : null
  } catch (err) {
    console.error(`[books-api] échec de vérification de la couverture Open Library (${isbn}):`, err)
    return null
  }
}

// La recherche (/volumes?q=...) ne renvoie jamais que smallThumbnail/thumbnail
// dans imageLinks, même quand une résolution plus grande existe. Il faut
// interroger le volume précis pour l'obtenir. Coûte un appel API, donc à
// réserver au moment où un livre est effectivement ajouté par un utilisateur
// (pas sur chaque résultat de recherche).
export async function getHighResCoverUrl(googleBooksId: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  if (!apiKey) return null

  const url = `https://www.googleapis.com/books/v1/volumes/${googleBooksId}?fields=volumeInfo(imageLinks)&key=${apiKey}`
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) {
      console.error(`[books-api] échec de récupération de la couverture HD (${googleBooksId}): ${res.status}`)
      return null
    }
    const data = await res.json()
    const imageLinks = data?.volumeInfo?.imageLinks as Record<string, string> | undefined
    const best = imageLinks?.large ?? imageLinks?.medium ?? imageLinks?.small
    return best ? best.replace("http://", "https://") : null
  } catch (err) {
    console.error(`[books-api] échec de récupération de la couverture HD (${googleBooksId}):`, err)
    return null
  }
}
