"use client"

import { useState, useMemo } from "react"
import { BookCard } from "./BookCard"
import { LibraryShelves } from "./LibraryShelves"
import { foregroundFor, luminance, readableTextOn, type ProfileFg } from "@/lib/profile-colors"
import { compareAuthors } from "@/lib/author-name"

const STATUS_LABELS: Record<string, string> = {
  ALL: "Tous",
  READING: "En cours",
  READ: "Lu",
  TO_READ: "À lire",
  ABANDONED: "Abandonné",
}

type SortBy = "status" | "title" | "author"
type FilterStatus = "ALL" | "READING" | "READ" | "TO_READ" | "ABANDONED"

const STATUS_ORDER: Record<string, number> = { READING: 0, READ: 1, TO_READ: 2, ABANDONED: 3 }

interface Book {
  id: string
  status: string
  rating: number | null
  book: {
    title: string
    authors: string[]
    coverUrl: string | null
    type: string
  }
}

interface ProfileBooksProps {
  books: Book[]
  accentColor: string
  layout?: "GRID" | "LIBRARY"
  shelfColor?: string
  fg?: ProfileFg
}

export function ProfileBooks({
  books,
  accentColor,
  layout = "GRID",
  shelfColor,
  fg = foregroundFor(0),
}: ProfileBooksProps) {
  const [filter, setFilter] = useState<FilterStatus>("ALL")
  const [sort, setSort] = useState<SortBy>("status")

  // La barre de contrôle a son propre fond sombre : le texte de la pastille
  // active dépend de l'accent, et un accent quasi noir retombe sur du clair
  const accentPillText = readableTextOn(accentColor)
  const accentOnBar = luminance(accentColor) < 0.05 ? "#e5e7eb" : accentColor

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const b of books) c[b.status] = (c[b.status] ?? 0) + 1
    return c
  }, [books])

  const displayed = useMemo(() => {
    const base = filter === "ALL" ? books : books.filter((b) => b.status === filter)
    return [...base].sort((a, b) => {
      if (sort === "title") return a.book.title.localeCompare(b.book.title, "fr", { sensitivity: "base" })
      if (sort === "author") {
        // Classement sur le nom de famille ; à auteur identique, les livres
        // se suivent dans l'ordre alphabétique des titres.
        return (
          compareAuthors(a.book.authors[0] ?? "", b.book.authors[0] ?? "") ||
          a.book.title.localeCompare(b.book.title, "fr", { sensitivity: "base" })
        )
      }
      return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    })
  }, [books, filter, sort])

  const activeStatuses = (["ALL", "READING", "READ", "TO_READ", "ABANDONED"] as FilterStatus[]).filter(
    (s) => s === "ALL" || (counts[s] ?? 0) > 0
  )

  return (
    <div>
      {/* Controls — fond semi-transparent pour être lisible sur n'importe quel fond de profil.
          Une seule ligne : défilement horizontal sur petit écran, scrollbar masquée */}
      <div
        className="flex items-center gap-3 mb-6 sm:mb-8 px-4 py-3 rounded-2xl overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // Suffisamment opaque pour rester une surface sombre sur fond clair
          background: "rgba(12,12,18,0.72)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Filtres statut */}
        <div className="flex gap-1.5">
          {activeStatuses.map((s) => {
            const active = filter === s
            return (
              <button
                key={s}
                onClick={() => {
                  setFilter(s)
                  // Un statut précis est déjà filtré : trier par statut n'a plus de sens
                  if (s !== "ALL" && sort === "status") setSort("title")
                }}
                className="text-xs px-3 py-1.5 rounded-full border transition-all font-medium whitespace-nowrap shrink-0"
                style={
                  active
                    ? { backgroundColor: accentColor, borderColor: accentColor, color: accentPillText }
                    : {
                        borderColor: "rgba(255,255,255,0.25)",
                        color: "rgba(255,255,255,0.75)",
                        backgroundColor: "rgba(255,255,255,0.05)",
                      }
                }
              >
                {STATUS_LABELS[s]}
                {s !== "ALL" && (
                  <span className="ml-1.5" style={{ opacity: active ? 0.75 : 0.55 }}>
                    {counts[s]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Séparateur */}
        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* Tri — « Statut » est caché quand un statut précis est déjà filtré */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
            Trier
          </span>
          {((filter === "ALL" ? ["status", "title", "author"] : ["title", "author"]) as SortBy[]).map((s) => {
            const active = sort === s
            return (
              <button
                key={s}
                onClick={() => setSort(s)}
                className="text-xs px-2.5 py-1 rounded-full border transition-all whitespace-nowrap shrink-0"
                style={
                  active
                    ? { borderColor: `${accentOnBar}70`, color: accentOnBar, backgroundColor: `${accentColor}20` }
                    : {
                        borderColor: "rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.55)",
                        backgroundColor: "transparent",
                      }
                }
              >
                {s === "status" ? "Statut" : s === "title" ? "A–Z" : "Auteur"}
              </button>
            )
          })}
        </div>
      </div>

      {/* Livres */}
      {displayed.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: fg.muted }}>
          Aucun livre dans cette catégorie.
        </p>
      ) : layout === "LIBRARY" ? (
        <LibraryShelves
          books={displayed.map((ub) => ({
            id: ub.id,
            title: ub.book.title,
            authors: ub.book.authors,
            coverUrl: ub.book.coverUrl,
            rating: ub.rating,
            status: ub.status,
          }))}
          shelfColor={shelfColor}
          accentColor={accentColor}
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
          {displayed.map((ub, i) => (
            <BookCard
              key={ub.id}
              title={ub.book.title}
              authors={ub.book.authors}
              coverUrl={ub.book.coverUrl}
              rating={ub.rating}
              type={ub.book.type}
              status={ub.status}
              index={i}
              accentColor={accentColor}
              fg={fg}
            />
          ))}
        </div>
      )}
    </div>
  )
}
