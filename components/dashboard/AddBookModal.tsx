"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Search, Plus, Check, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface BookResult {
  id: string
  title: string
  authors: string[]
  coverUrl: string | null
  publishYear: number | null
  openLibraryId: string | null
  googleBooksId: string | null
  type: string
}

interface AddBookModalProps {
  open: boolean
  onClose: () => void
  onAdd: (book: BookResult, status: string) => Promise<void>
  existingBookIds?: Set<string>
}

const STATUSES = [
  { value: "TO_READ", label: "À lire" },
  { value: "READING", label: "En cours" },
  { value: "READ", label: "Lu" },
]

const SEARCH_DEBOUNCE_MS = 400
const MIN_QUERY_LENGTH = 3

export function AddBookModal({ open, onClose, onAdd, existingBookIds }: AddBookModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<BookResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState("TO_READ")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function search(q: string) {
    // Annule la requête précédente encore en vol pour éviter qu'une réponse
    // obsolète n'écrase les résultats d'une recherche plus récente.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (!res.ok) {
        setResults([])
        setError(true)
        return
      }
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setResults([])
      setError(true)
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }

  function handleQuery(v: string) {
    setQuery(v)
    // Annule le timer précédent avant d'en créer un nouveau
    if (timerRef.current) clearTimeout(timerRef.current)
    if (v.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort()
      setResults([])
      setError(false)
      setLoading(false)
      return
    }
    timerRef.current = setTimeout(() => search(v), SEARCH_DEBOUNCE_MS)
  }

  function handleClose() {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    setQuery("")
    setResults([])
    setError(false)
    onClose()
  }

  async function handleAdd(book: BookResult) {
    setAdding(book.id)
    await onAdd(book, selectedStatus)
    setAdding(null)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un livre</DialogTitle>
        </DialogHeader>

        {/* Status selector */}
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedStatus(s.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                selectedStatus === s.value
                  ? "bg-amber-600 border-amber-500 text-white"
                  : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Titre, auteur, ISBN…"
            className="pl-9 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-600"
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {loading && (
            <p className="text-sm text-gray-500 text-center py-4">Recherche…</p>
          )}
          {!loading && error && (
            <p className="text-sm text-red-400 text-center py-4">
              La recherche a échoué. Réessayez dans un instant.
            </p>
          )}
          {!loading && !error && results.length === 0 && query.length >= MIN_QUERY_LENGTH && (
            <p className="text-sm text-gray-500 text-center py-4">Aucun résultat</p>
          )}
          {results.map((book) => {
            const alreadyAdded = !!(
              existingBookIds &&
              ((book.googleBooksId && existingBookIds.has(book.googleBooksId)) ||
                (book.openLibraryId && existingBookIds.has(book.openLibraryId)))
            )
            return (
              <div
                key={book.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-14 rounded shrink-0 bg-gray-200 dark:bg-white/10 overflow-hidden">
                  {book.coverUrl && (
                    <Image src={book.coverUrl} alt={book.title} width={40} height={56} className="object-cover w-full h-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{book.title}</p>
                  <p className="text-xs text-gray-400 truncate">{book.authors.join(", ")}</p>
                  {book.publishYear && (
                    <p className="text-xs text-gray-600">{book.publishYear}</p>
                  )}
                </div>
                {alreadyAdded ? (
                  <span
                    title="Déjà dans ta bibliothèque"
                    className="shrink-0 flex items-center gap-1 text-xs text-emerald-400 px-2.5 py-1.5"
                  >
                    <Check className="w-4 h-4" />
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAdd(book)}
                    disabled={adding === book.id}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
