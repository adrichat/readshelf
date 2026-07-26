export interface BookSearchResult {
  id: string
  title: string
  authors: string[]
  coverUrl: string | null
  publishYear: number | null
  isbn: string | null
  openLibraryId: string | null
  googleBooksId: string | null
  type: "NOVEL" | "MANGA" | "COMIC"
}

const FIELDS = "items(id,volumeInfo(title,authors,publishedDate,imageLinks,industryIdentifiers,language))"

// Cache mémoire courte durée : évite de re-frapper l'API pour la même requête
// (frappe répétées en dev, retype de la même recherche, etc.).
const cache = new Map<string, { at: number; results: BookSearchResult[] }>()
const CACHE_TTL_MS = 5 * 60 * 1000

function buildUrl(q: string, apiKey: string) {
  const encoded = encodeURIComponent(q)
  // Pas de langRestrict — trop restrictif, coupe les mangas/livres dont Google n'a pas indexé la langue
  // country=FR : sans ce paramètre, Google tente de géolocaliser l'appelant via son IP pour la
  // vérification de disponibilité, et échoue souvent silencieusement sur des IP de serveur/datacenter
  // (renvoie alors 503 "backendFailed" au lieu d'un vrai résultat).
  return `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=20&printType=books&country=FR&key=${apiKey}&fields=${FIELDS}`
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

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const cacheKey = query.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.results
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  if (!apiKey) return []

  // Une recherche libre (sans opérateur) fait un ET implicite sur tous les mots ;
  // avec des titres français pleins de mots courants ("la", "de"...), le livre
  // cherché se retrouve noyé et sort du top 20 alors qu'il matche parfaitement le
  // titre. On cible donc d'abord le champ titre via intitle:, et on ne retombe sur
  // la recherche libre (titre+auteur+description) que si ça ne trouve rien — ce qui
  // couvre aussi les recherches par nom d'auteur.
  let items = await fetchVolumes(buildUrl(`intitle:"${query}"`, apiKey))
  if (!items || items.length === 0) {
    items = await fetchVolumes(buildUrl(query, apiKey))
  }
  if (items === null) {
    // Les deux tentatives ont échoué (après retries) : on ne cache pas cet échec
    // pour permettre un retry rapide côté client.
    return []
  }

  const results = items.map((item) => {
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
      coverUrl = thumb.replace("http://", "https://").replace("zoom=1", "zoom=2")
    }

    const dateStr = vi.publishedDate as string | undefined
    const publishYear = dateStr ? parseInt(dateStr.substring(0, 4), 10) || null : null
    const language = vi.language as string | undefined

    return {
      id: `gb_${item.id as string}`,
      title: (vi.title as string) ?? "Sans titre",
      authors: (vi.authors as string[]) ?? [],
      coverUrl,
      publishYear,
      isbn,
      openLibraryId: null,
      googleBooksId: item.id as string,
      type: "NOVEL" as const,
      _lang: language ?? "",
    }
  })

  // Éditions françaises en premier, puis les autres
  results.sort((a, b) => {
    const aFr = a._lang === "fr" ? 1 : 0
    const bFr = b._lang === "fr" ? 1 : 0
    return bFr - aFr
  })

  const final = results.map(({ _lang, ...r }) => r)
  cache.set(cacheKey, { at: Date.now(), results: final })
  return final
}

export function getCoverUrl(openLibraryId: string, size: "S" | "M" | "L" = "M") {
  return `https://covers.openlibrary.org/b/olid/${openLibraryId}-${size}.jpg`
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
