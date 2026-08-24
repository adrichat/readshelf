"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Star, Heart, ChevronDown, Check, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddBookModal } from "@/components/dashboard/AddBookModal"
import { triggerAchievementsCheck } from "@/lib/achievements-events"

interface UserBook {
  id: string
  status: string
  rating: number | null
  isFavorite: boolean
  order: number
  book: {
    id: string
    title: string
    authors: string[]
    coverUrl: string | null
    type: string
    googleBooksId: string | null
    openLibraryId: string | null
  }
}

const STATUS_LABELS: Record<string, string> = {
  READING: "En cours",
  READ: "Lu",
  TO_READ: "À lire",
  ABANDONED: "Abandonné",
}

const STATUS_COLORS: Record<string, string> = {
  READING: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  READ: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  TO_READ: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30",
  // Conservé pour les livres déjà marqués "Abandonné" en base (fonctionnalité
  // retirée du picker et des filtres, mais l'ancien statut doit rester lisible)
  ABANDONED: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
}

const STATUS_DOTS: Record<string, string> = {
  READING: "#60a5fa",
  READ: "#4ade80",
  TO_READ: "#9ca3af",
  ABANDONED: "#f87171",
}

const ALL_STATUSES = ["READING", "READ", "TO_READ"]

interface StatusPickerProps {
  ub: UserBook
  open: boolean
  onToggle: () => void
  onClose: () => void
  onSelect: (status: string) => void
}

// Badge de statut cliquable + menu déroulant — partagé entre les vues grille et liste
function StatusPicker({ ub, open, onToggle, onClose, onSelect }: StatusPickerProps) {
  return (
    <div className="relative w-fit shrink-0">
      <button
        onClick={onToggle}
        title="Changer le statut"
        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:brightness-125 ${STATUS_COLORS[ub.status]}`}
      >
        {STATUS_LABELS[ub.status]}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {/* Ferme le menu au clic en dehors */}
      {open && <div className="fixed inset-0 z-40" onClick={onClose} />}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute left-0 top-full mt-1 z-50 w-36 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161c] shadow-xl p-1 flex flex-col"
          >
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => onSelect(s)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5 ${
                  s === ub.status ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_DOTS[s] }}
                />
                <span className="flex-1">{STATUS_LABELS[s]}</span>
                {s === ub.status && <Check className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LibraryPage() {
  const [books, setBooks] = useState<UserBook[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<string>("ALL")
  const [favError, setFavError] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null)
  const [view, setView] = useState<"grid" | "list">("grid")

  useEffect(() => {
    fetch("/api/userbooks/list")
      .then((r) => r.json())
      .then((data) => { setBooks(data); setLoading(false) })
  }, [])

  // Livres déjà présents dans la bibliothèque, pour empêcher un doublon depuis la recherche
  const existingBookIds = new Set(
    books.map((ub) => ub.book.googleBooksId ?? ub.book.openLibraryId).filter((id): id is string => !!id)
  )

  async function handleAdd(book: object, status: string) {
    const res = await fetch("/api/userbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book, status }),
    })
    // La modal reste ouverte et affiche l'erreur : sans ce throw, une réponse
    // d'erreur serait insérée telle quelle dans la liste des livres.
    if (!res.ok) throw new Error("add_failed")
    const newBook = await res.json()
    // Remplace l'entrée existante si le livre était déjà dans la bibliothèque
    // (le serveur met simplement à jour son statut, il ne crée pas de doublon)
    // au lieu de la dupliquer dans la liste locale.
    setBooks((prev) => [newBook, ...prev.filter((b) => b.id !== newBook.id)])
    triggerAchievementsCheck()
  }

  async function handleDelete(userBookId: string) {
    await fetch("/api/userbooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userBookId }),
    })
    setBooks((prev) => prev.filter((b) => b.id !== userBookId))
  }

  async function handleFavorite(ub: UserBook): Promise<boolean> {
    setFavError("")
    const next = !ub.isFavorite

    const res = await fetch("/api/userbooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userBookId: ub.id, isFavorite: next }),
    })

    if (!res.ok) {
      const data = await res.json()
      if (data.error === "MAX_FAVORITES") {
        setFavError("Tu as déjà 4 livres favoris. Retire-en un d'abord.")
        setTimeout(() => setFavError(""), 3000)
      }
      return false
    }

    // Le serveur calcule le `order` d'ajout (fin de liste des favoris) :
    // on reprend sa valeur plutôt que de la deviner côté client.
    const updated = await res.json()
    setBooks((prev) =>
      prev.map((b) => (b.id === ub.id ? { ...b, isFavorite: updated.isFavorite, order: updated.order } : b))
    )
    return true
  }

  async function handleStatusChange(ub: UserBook, status: string) {
    setStatusMenuId(null)
    if (status === ub.status) return
    const res = await fetch("/api/userbooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userBookId: ub.id, status }),
    })
    if (res.ok) {
      setBooks((prev) => prev.map((b) => (b.id === ub.id ? { ...b, status } : b)))
      triggerAchievementsCheck()
    }
  }

  async function persistFavOrder(orderedIds: string[]) {
    setBooks((prev) =>
      prev.map((b) => {
        const idx = orderedIds.indexOf(b.id)
        return idx === -1 ? b : { ...b, order: idx }
      })
    )
    await fetch("/api/userbooks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    })
  }

  // Dépôt d'un livre sur la zone favoris : ajout, ou réorganisation s'il y est déjà
  async function handleDropOnFavorites(bookId: string, targetIndex: number | null) {
    const ub = books.find((b) => b.id === bookId)
    if (!ub) return

    const ids = favorites.map((f) => f.id)

    if (ub.isFavorite) {
      const from = ids.indexOf(bookId)
      if (from === -1) return
      ids.splice(from, 1)
      const to = targetIndex === null ? ids.length : Math.min(targetIndex, ids.length)
      ids.splice(to, 0, bookId)
      await persistFavOrder(ids)
      return
    }

    if (favorites.length >= 4) {
      setFavError("Tu as déjà 4 livres favoris. Retire-en un d'abord.")
      setTimeout(() => setFavError(""), 3000)
      return
    }

    const ok = await handleFavorite(ub)
    if (!ok) return
    const to = targetIndex === null ? ids.length : Math.min(targetIndex, ids.length)
    ids.splice(to, 0, bookId)
    await persistFavOrder(ids)
  }

  const favorites = books
    .filter((b) => b.isFavorite)
    .sort((a, b) => a.order - b.order)
  const filtered = filter === "ALL" ? books : books.filter((b) => b.status === filter)

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ma bibliothèque</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{books.length} livre{books.length !== 1 ? "s" : ""}</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un livre
        </Button>
      </div>

      {/* Section favoris — compacte, zone de drop */}
      {books.length > 0 && (
        <div
          className={`mb-6 p-4 rounded-xl border transition-colors ${
            dragId ? "border-amber-500/60 bg-amber-500/5" : "border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02]"
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const id = e.dataTransfer.getData("text/plain")
            if (id) handleDropOnFavorites(id, null)
            setDragId(null)
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span className="text-xs font-semibold">Livres préférés</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{favorites.length}/4</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {dragId
                ? "Dépose ici pour l'ajouter aux favoris"
                : "Glisse un livre ici · affichés en premier sur ton profil"}
            </p>
          </div>

          {favError && (
            <p className="text-xs text-red-600 dark:text-red-400 mb-2">{favError}</p>
          )}

          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => {
              const fav = favorites[i]
              return fav ? (
                <div
                  key={fav.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", fav.id)
                    setDragId(fav.id)
                  }}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const id = e.dataTransfer.getData("text/plain")
                    if (id && id !== fav.id) handleDropOnFavorites(id, i)
                    setDragId(null)
                  }}
                  className="relative group w-40 cursor-grab active:cursor-grabbing"
                  title={fav.book.title}
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    {fav.book.coverUrl ? (
                      <Image src={fav.book.coverUrl} alt={fav.book.title} fill className="object-cover" sizes="160px" priority draggable={false} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">📖</div>
                    )}
                    <button
                      onClick={() => handleFavorite(fav)}
                      className="absolute top-1 right-1 p-1.5 rounded bg-black/70 hover:bg-black/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      title="Retirer des favoris"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={`slot-${i}`}
                  onClick={() => setModalOpen(true)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const id = e.dataTransfer.getData("text/plain")
                    if (id) handleDropOnFavorites(id, i)
                    setDragId(null)
                  }}
                  className={`w-40 aspect-[2/3] rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${
                    dragId ? "border-amber-500/60" : "border-gray-300 dark:border-white/10 hover:border-amber-500/40"
                  }`}
                >
                  <Plus className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters + bascule grille/liste */}
      <div className="flex items-center flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap flex-1">
          {["ALL", "READING", "READ", "TO_READ"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === s
                  ? "bg-amber-600 border-amber-500 text-white"
                  : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              {s === "ALL" ? "Tous" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-0.5 shrink-0">
          <button
            onClick={() => setView("grid")}
            aria-label="Vue grille"
            title="Vue grille"
            className={`p-1.5 rounded-md transition-colors ${
              view === "grid" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="Vue liste"
            title="Vue liste"
            className={`p-1.5 rounded-md transition-colors ${
              view === "list" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

          {loading ? (
            <div className="text-gray-600 dark:text-gray-400 text-sm">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-600 dark:text-gray-400">
              <p className="text-4xl mb-3">📚</p>
              <p>Ta bibliothèque est vide.</p>
              <Button onClick={() => setModalOpen(true)} className="mt-4 bg-amber-600 hover:bg-amber-700 text-white">
                Ajouter ton premier livre
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {view === "grid" ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-wrap gap-4"
                >
                  {filtered.map((ub, i) => (
                    <motion.div
                      key={ub.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3, ease: "easeOut" }}
                      className="w-40"
                    >
                      {/* Wrapper séparé : motion.div intercepte les événements
                          onDragStart/onDragEnd du drag natif HTML5 */}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", ub.id)
                          setDragId(ub.id)
                        }}
                        onDragEnd={() => setDragId(null)}
                        className="group relative flex flex-col gap-2 cursor-grab active:cursor-grabbing"
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                          {ub.book.coverUrl ? (
                            <Image src={ub.book.coverUrl} alt={ub.book.title} fill className="object-cover" sizes="160px" priority={i < 6} draggable={false} />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-2xl">📖</div>
                          )}

                          {/* Actions : toujours visibles sur mobile (pas de hover tactile), au survol sur desktop */}
                          <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleFavorite(ub)}
                              className="p-1.5 rounded bg-black/70 hover:bg-black/90 transition-colors"
                              title={ub.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 transition-colors ${
                                  ub.isFavorite ? "text-rose-400 fill-rose-400" : "text-gray-400"
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => handleDelete(ub.id)}
                              className="p-1.5 rounded bg-black/70 hover:bg-black/90 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>

                          {/* Indicateur favori */}
                          {ub.isFavorite && (
                            <div className="absolute top-1 left-1">
                              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 drop-shadow" />
                            </div>
                          )}
                        </div>

                        <p className="text-xs font-medium line-clamp-2 leading-tight">{ub.book.title}</p>

                        <StatusPicker
                          ub={ub}
                          open={statusMenuId === ub.id}
                          onToggle={() => setStatusMenuId(statusMenuId === ub.id ? null : ub.id)}
                          onClose={() => setStatusMenuId(null)}
                          onSelect={(s) => handleStatusChange(ub, s)}
                        />

                        {ub.rating && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < (ub.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-2"
                >
                  {filtered.map((ub, i) => (
                    <motion.div
                      key={ub.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.25), duration: 0.25, ease: "easeOut" }}
                    >
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", ub.id)
                          setDragId(ub.id)
                        }}
                        onDragEnd={() => setDragId(null)}
                        className="flex items-center gap-3 sm:gap-4 p-2 pr-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-grab active:cursor-grabbing group"
                      >
                        <div className="relative w-10 aspect-[2/3] rounded-md overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0">
                          {ub.book.coverUrl ? (
                            <Image src={ub.book.coverUrl} alt={ub.book.title} fill className="object-cover" sizes="40px" draggable={false} />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-sm">📖</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ub.book.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {ub.book.authors[0] ?? "Auteur inconnu"}
                          </p>
                        </div>

                        <StatusPicker
                          ub={ub}
                          open={statusMenuId === ub.id}
                          onToggle={() => setStatusMenuId(statusMenuId === ub.id ? null : ub.id)}
                          onClose={() => setStatusMenuId(null)}
                          onSelect={(s) => handleStatusChange(ub, s)}
                        />

                        <div className="flex items-center shrink-0">
                          <button
                            onClick={() => handleFavorite(ub)}
                            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            title={ub.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                          >
                            <Heart className={`w-3.5 h-3.5 ${ub.isFavorite ? "text-rose-400 fill-rose-400" : ""}`} />
                          </button>
                          <button
                            onClick={() => handleDelete(ub.id)}
                            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
      )}

      <AddBookModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
        existingBookIds={existingBookIds}
      />
    </div>
  )
}
