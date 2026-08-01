import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  normalizeCacheKey,
  mergeVolumes,
  mapVolume,
  rankResults,
  findOpenLibraryCover,
  findBestCoverUrl,
  mapOpenLibraryDoc,
  combineSources,
} from "@/lib/books-api"
import type { BookSearchResult } from "@/lib/books-api"

function vol(id: string, volumeInfo: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, volumeInfo }
}

function result(overrides: Partial<BookSearchResult> = {}): BookSearchResult {
  return {
    id: "gb_x",
    title: "Titre",
    authors: [],
    coverUrl: null,
    publishYear: null,
    isbn: null,
    openLibraryId: null,
    googleBooksId: "x",
    language: null,
    type: "NOVEL",
    ...overrides,
  }
}

describe("normalizeCacheKey", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeCacheKey("  Le  Petit\t PRINCE ")).toBe("le petit prince")
  })

  it("preserves accents", () => {
    expect(normalizeCacheKey("Éric-Emmanuel Schmitt")).toBe("éric-emmanuel schmitt")
  })

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeCacheKey("   ")).toBe("")
  })
})

describe("mergeVolumes", () => {
  it("returns null when both calls failed", () => {
    expect(mergeVolumes(null, null)).toBeNull()
  })

  it("tolerates a single failed call and returns the survivor's items", () => {
    const items = [vol("a"), vol("b")]
    expect(mergeVolumes(null, items)).toEqual(items)
    expect(mergeVolumes(items, null)).toEqual(items)
  })

  it("puts FR items first and dedupes by volume id (FR position wins)", () => {
    const fr = [vol("a"), vol("b")]
    const all = [vol("b"), vol("c")]
    const merged = mergeVolumes(fr, all)
    expect(merged?.map((v) => v.id)).toEqual(["a", "b", "c"])
  })

  it("preserves relevance order within each source", () => {
    const fr = [vol("f2"), vol("f1")]
    const all = [vol("a3"), vol("a1")]
    const merged = mergeVolumes(fr, all)
    expect(merged?.map((v) => v.id)).toEqual(["f2", "f1", "a3", "a1"])
  })

  it("keeps duplicate ISBNs on distinct volume ids (distinct editions)", () => {
    const isbn = { industryIdentifiers: [{ type: "ISBN_13", identifier: "9781234567897" }] }
    const merged = mergeVolumes([vol("a", isbn)], [vol("b", isbn)])
    expect(merged?.map((v) => v.id)).toEqual(["a", "b"])
  })
})

describe("mapVolume", () => {
  it("maps a full volume", () => {
    const mapped = mapVolume(
      vol("abc", {
        title: "Le Petit Prince",
        authors: ["Antoine de Saint-Exupéry"],
        publishedDate: "1943-04-06",
        language: "FR",
        imageLinks: { thumbnail: "http://books.google.com/books/content?id=abc&zoom=1" },
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0156012197" },
          { type: "ISBN_13", identifier: "9780156012195" },
        ],
      })
    )
    expect(mapped).toEqual({
      id: "gb_abc",
      title: "Le Petit Prince",
      authors: ["Antoine de Saint-Exupéry"],
      coverUrl: "https://books.google.com/books/content?id=abc&zoom=1",
      publishYear: 1943,
      isbn: "9780156012195",
      openLibraryId: null,
      googleBooksId: "abc",
      language: "fr",
      type: "NOVEL",
    })
  })

  it("keeps the thumbnail at zoom=1 (zoom=2 often serves Google's placeholder)", () => {
    const mapped = mapVolume(
      vol("abc", { imageLinks: { thumbnail: "http://books.google.com/books/content?id=abc&zoom=1&source=gbs_api" } })
    )
    expect(mapped.coverUrl).toBe("https://books.google.com/books/content?id=abc&zoom=1&source=gbs_api")
  })

  it("falls back to an Open Library cover by ISBN when Google has no image", () => {
    const mapped = mapVolume(
      vol("abc", { industryIdentifiers: [{ type: "ISBN_13", identifier: "9781234567897" }] })
    )
    expect(mapped.coverUrl).toBe("https://covers.openlibrary.org/b/isbn/9781234567897-M.jpg?default=false")
  })

  it("leaves coverUrl null without image nor ISBN", () => {
    expect(mapVolume(vol("abc")).coverUrl).toBeNull()
  })

  it("applies defaults when volumeInfo fields are missing", () => {
    const mapped = mapVolume({ id: "abc" })
    expect(mapped.title).toBe("Sans titre")
    expect(mapped.authors).toEqual([])
    expect(mapped.publishYear).toBeNull()
    expect(mapped.isbn).toBeNull()
    expect(mapped.language).toBeNull()
    expect(mapped.type).toBe("NOVEL")
  })
})

describe("rankResults", () => {
  it("puts French editions first, keeping relative order (stable)", () => {
    const input = [
      result({ id: "1", language: "en" }),
      result({ id: "2", language: "fr" }),
      result({ id: "3", language: null }),
      result({ id: "4", language: "fr" }),
      result({ id: "5", language: "en" }),
    ]
    expect(rankResults(input, "zzz").map((r) => r.id)).toEqual(["2", "4", "1", "3", "5"])
  })

  it("boosts titles containing the query within a language group", () => {
    const input = [
      result({ id: "1", language: "fr", title: "Autre chose" }),
      result({ id: "2", language: "fr", title: "Le Comte de Monte-Cristo" }),
      result({ id: "3", language: "en", title: "The Count of Monte Cristo" }),
    ]
    expect(rankResults(input, "monte-cristo").map((r) => r.id)).toEqual(["2", "1", "3"])
  })

  it("ranks author matches above title mentions (novels before study guides)", () => {
    const input = [
      result({ id: "1", language: "fr", title: "La vie secrète des écrivains de Guillaume Musso (Analyse)", authors: ["Jessica Hermans"] }),
      result({ id: "2", language: "fr", title: "La vie secrète des écrivains", authors: ["Guillaume Musso"] }),
    ]
    expect(rankResults(input, "guillaume musso").map((r) => r.id)).toEqual(["2", "1"])
  })

  it("matches titles accent- and case-insensitively", () => {
    const input = [
      result({ id: "1", language: "fr", title: "Sans rapport" }),
      result({ id: "2", language: "fr", title: "Éric et compagnie" }),
    ]
    expect(rankResults(input, "eric").map((r) => r.id)).toEqual(["2", "1"])
  })

  it("caps at 20 results with FR still leading", () => {
    const input = [
      ...Array.from({ length: 25 }, (_, i) => result({ id: `en${i}`, language: "en" })),
      result({ id: "fr1", language: "fr" }),
    ]
    const ranked = rankResults(input, "zzz")
    expect(ranked).toHaveLength(20)
    expect(ranked[0].id).toBe("fr1")
  })
})

describe("findOpenLibraryCover", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns the verified URL when the cover exists (HEAD 200)", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const url = await findOpenLibraryCover("9781234567897", "L")
    expect(url).toBe("https://covers.openlibrary.org/b/isbn/9781234567897-L.jpg?default=false")
    expect(fetchMock.mock.calls[0][1]?.method).toBe("HEAD")
  })

  it("returns null when Open Library has no cover (404)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })))
    expect(await findOpenLibraryCover("9781234567897")).toBeNull()
  })

  it("returns null on network failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    expect(await findOpenLibraryCover("9781234567897")).toBeNull()
  })
})

describe("mapOpenLibraryDoc", () => {
  it("maps a work with its preferred edition", () => {
    const mapped = mapOpenLibraryDoc({
      key: "/works/OL123W",
      title: "House of Leaves",
      author_name: ["Mark Z. Danielewski"],
      first_publish_year: 2000,
      cover_i: 6450442,
      editions: {
        docs: [
          {
            key: "/books/OL456M",
            title: "La Maison des Feuilles",
            language: ["fre"],
            isbn: ["2207252000", "9782381960647"],
            cover_i: 14636088,
            publish_date: "Jun 03, 2022",
          },
        ],
      },
    })
    expect(mapped).toEqual({
      id: "ol_OL456M",
      title: "La Maison des Feuilles",
      authors: ["Mark Z. Danielewski"],
      coverUrl: "https://covers.openlibrary.org/b/id/14636088-M.jpg",
      publishYear: 2022,
      isbn: "9782381960647",
      openLibraryId: "OL456M",
      googleBooksId: null,
      language: "fr",
      type: "NOVEL",
    })
  })

  it("falls back to work-level fields without editions", () => {
    const mapped = mapOpenLibraryDoc({
      key: "/works/OL123W",
      title: "House of Leaves",
      author_name: ["Mark Z. Danielewski"],
      first_publish_year: 2000,
      cover_i: 6450442,
    })
    expect(mapped).toMatchObject({
      id: "ol_OL123W",
      title: "House of Leaves",
      openLibraryId: "OL123W",
      publishYear: 2000,
      isbn: null,
      language: null,
      coverUrl: "https://covers.openlibrary.org/b/id/6450442-M.jpg",
    })
  })

  it("maps unknown MARC language codes to null (no wrong badge)", () => {
    const mapped = mapOpenLibraryDoc({
      key: "/works/OL1W",
      title: "T",
      editions: { docs: [{ key: "/books/OL2M", title: "T", language: ["xxx"] }] },
    })
    expect(mapped?.language).toBeNull()
  })

  it("returns null without a title", () => {
    expect(mapOpenLibraryDoc({ key: "/works/OL1W" })).toBeNull()
  })
})

describe("combineSources", () => {
  it("drops secondary entries sharing an ISBN with the primary", () => {
    const primary = [result({ id: "gb_1", isbn: "9781234567897" })]
    const secondary = [result({ id: "ol_1", isbn: "9781234567897", title: "Autre titre" })]
    expect(combineSources(primary, secondary).map((r) => r.id)).toEqual(["gb_1"])
  })

  it("drops secondary entries with the same title and first author (accents ignored)", () => {
    const primary = [result({ id: "gb_1", title: "Le Comte de Monte-Cristo", authors: ["Alexandre Dumas"] })]
    const secondary = [result({ id: "ol_1", title: "le comte de monte-cristo", authors: ["Alexandre DUMAS"] })]
    expect(combineSources(primary, secondary).map((r) => r.id)).toEqual(["gb_1"])
  })

  it("appends genuinely new secondary results after the primary", () => {
    const primary = [result({ id: "gb_1", title: "Livre A" })]
    const secondary = [result({ id: "ol_1", title: "Livre B", isbn: "9789999999999" })]
    expect(combineSources(primary, secondary).map((r) => r.id)).toEqual(["gb_1", "ol_1"])
  })
})

describe("findBestCoverUrl", () => {
  const GOOGLE_THUMB = "https://books.google.com/books/content?id=x&printsec=frontcover&img=1&zoom=1"

  function imageResponse(contentType: string) {
    return { ok: true, status: 200, headers: new Headers({ "content-type": contentType }), body: undefined }
  }

  beforeEach(() => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key")
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("prefers the fife-resized Google thumbnail when it serves a real JPEG", async () => {
    const fetchMock = vi.fn(async (_url: string) => imageResponse("image/jpeg"))
    vi.stubGlobal("fetch", fetchMock)

    const url = await findBestCoverUrl({ coverUrl: GOOGLE_THUMB, googleBooksId: "x", isbn: "9781234567897" })
    expect(url).toBe(`${GOOGLE_THUMB}&fife=w800`)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("falls back to the volume's HD links when fife serves the PNG placeholder", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("fife=")) return imageResponse("image/png")
      if (url.includes("googleapis.com/books/v1/volumes/x")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ volumeInfo: { imageLinks: { large: "http://books.google.com/large" } } }),
        }
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const url = await findBestCoverUrl({ coverUrl: GOOGLE_THUMB, googleBooksId: "x", isbn: null })
    expect(url).toBe("https://books.google.com/large")
  })

  it("falls back to a verified Open Library cover when Google has nothing", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("covers.openlibrary.org")) return { ok: true, status: 200 }
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal("fetch", fetchMock)

    const url = await findBestCoverUrl({ coverUrl: null, googleBooksId: "x", isbn: "9781234567897" })
    expect(url).toBe("https://covers.openlibrary.org/b/isbn/9781234567897-L.jpg?default=false")
  })

  it("keeps the plain Google thumbnail as last resort", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("fife=")) return imageResponse("image/png")
      if (url.includes("covers.openlibrary.org")) return { ok: false, status: 404 }
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal("fetch", fetchMock)

    const url = await findBestCoverUrl({ coverUrl: GOOGLE_THUMB, googleBooksId: "x", isbn: "9781234567897" })
    expect(url).toBe(GOOGLE_THUMB)
  })

  it("never returns an unverified Open Library URL", async () => {
    const olSearchUrl = "https://covers.openlibrary.org/b/isbn/9781234567897-M.jpg?default=false"
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("covers.openlibrary.org")) return { ok: false, status: 404 }
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal("fetch", fetchMock)

    const url = await findBestCoverUrl({ coverUrl: olSearchUrl, googleBooksId: null, isbn: "9781234567897" })
    expect(url).toBeNull()
  })
})

describe("searchBooks", () => {
  function okResponse(items: Record<string, unknown>[]) {
    return { ok: true, status: 200, json: async () => ({ items }) }
  }

  function okJson(payload: unknown) {
    return { ok: true, status: 200, json: async () => payload }
  }

  async function freshSearchBooks() {
    // Réimporte le module pour repartir d'un cache mémoire vide à chaque test.
    vi.resetModules()
    const mod = await import("@/lib/books-api")
    return mod.searchBooks
  }

  beforeEach(() => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key")
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("issues three parallel calls: Google fr, Google all, Open Library — none with intitle", async () => {
    const fetchMock = vi.fn(async (_url: string) => okResponse([]))
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    await searchBooks("dune")

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls.filter((u) => u.includes("langRestrict=fr"))).toHaveLength(1)
    expect(urls.filter((u) => u.includes("openlibrary.org/search.json"))).toHaveLength(1)
    expect(urls.every((u) => !u.includes("intitle"))).toBe(true)
  })

  it("returns Open Library results when Google has nothing (index gap)", async () => {
    const olDoc = {
      key: "/works/OL123W",
      title: "House of Leaves",
      author_name: ["Mark Z. Danielewski"],
      editions: {
        docs: [
          {
            key: "/books/OL456M",
            title: "La Maison des Feuilles",
            language: ["fre"],
            isbn: ["9782381960647"],
            cover_i: 14636088,
          },
        ],
      },
    }
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("openlibrary.org") ? okJson({ docs: [olDoc] }) : okResponse([])
    )
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    const results = await searchBooks("la maison des feuilles")
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: "ol_OL456M",
      title: "La Maison des Feuilles",
      openLibraryId: "OL456M",
      googleBooksId: null,
      isbn: "9782381960647",
      language: "fr",
      coverUrl: "https://covers.openlibrary.org/b/id/14636088-M.jpg",
    })
  })

  it("ranks FR editions first in the merged output", async () => {
    const frVol = vol("f1", { title: "Dune", language: "fr" })
    const enVol = vol("e1", { title: "Dune", language: "en" })
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("langRestrict=fr") ? okResponse([frVol]) : okResponse([enVol, frVol])
    )
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    const results = await searchBooks("dune")
    expect(results.map((r) => r.googleBooksId)).toEqual(["f1", "e1"])
  })

  it("tolerates one failed call and serves the other's results", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("langRestrict=fr")) throw new Error("network down")
      return okResponse([vol("a", { title: "Dune" })])
    })
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    const results = await searchBooks("dune")
    expect(results.map((r) => r.googleBooksId)).toEqual(["a"])
  })

  it("skips Open Library in quick mode (two Google calls only)", async () => {
    const fetchMock = vi.fn(async (_url: string) => okResponse([]))
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    await searchBooks("dune", { includeOpenLibrary: false })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls.some((u) => u.includes("openlibrary.org"))).toBe(false)
  })

  it("caches quick and full modes separately", async () => {
    const fetchMock = vi.fn(async (_url: string) => okResponse([]))
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    await searchBooks("dune", { includeOpenLibrary: false })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await searchBooks("dune")
    expect(fetchMock).toHaveBeenCalledTimes(5)
    await searchBooks("dune", { includeOpenLibrary: false })
    await searchBooks("dune")
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it("rejects in quick mode when both Google calls fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    const searchBooks = await freshSearchBooks()

    await expect(searchBooks("dune", { includeOpenLibrary: false })).rejects.toThrow("search_sources_unavailable")
  })

  it("rejects when every source fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    const searchBooks = await freshSearchBooks()

    await expect(searchBooks("dune")).rejects.toThrow("search_sources_unavailable")
  })

  it("rejects and logs when the API key is missing", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "")
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    await expect(searchBooks("dune")).rejects.toThrow("missing_api_key")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  it("serves the cache for the same normalized query (case/spacing variants)", async () => {
    const fetchMock = vi.fn(async () => okResponse([vol("a", { title: "Dune" })]))
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    await searchBooks("Dune ")
    await searchBooks("  dune")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("returns [] for a whitespace-only query without calling the API", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const searchBooks = await freshSearchBooks()

    expect(await searchBooks("   ")).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
