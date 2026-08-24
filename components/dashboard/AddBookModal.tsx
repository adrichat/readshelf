"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Search, Plus, Check, X, Loader2 } from "lucide-react"
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
  language: string | null
  type: string
}

interface AddBookModalProps {
  open: boolean
  onClose: () => void
  onAdd: (book: BookResult, status: string) => Promise<void>
  existingBookIds?: Set<string>
}

const STATUSES = [
  { value: "TO_READ", label: "À lire", dot: "#9ca3af" },
  { value: "READING", label: "En cours", dot: "#60a5fa" },
  { value: "READ", label: "Lu", dot: "#4ade80" },
]

const SEARCH_DEBOUNCE_MS = 400
const MIN_QUERY_LENGTH = 3

export function AddBookModal({ open, onClose, onAdd, existingBookIds }: AddBookModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<BookResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | "generic" | "rate_limited">(null)
  const [failedCovers, setFailedCovers] = useState<Set<string>>(new Set())
  // La recherche étendue (Google + Open Library) est encore en vol : les
  // résultats rapides (Google seul) sont déjà affichés en attendant.
  const [pendingFull, setPendingFull] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [addError, setAddError] = useState(false)
  // Aucun statut par défaut : c'est un choix explicite, exigé avant chaque ajout.
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  // Signale visuellement le statut manquant quand on tente d'ajouter sans l'avoir choisi.
  const [statusMissing, setStatusMissing] = useState(false)
  // Livres ajoutés pendant cette session de modal : la liste reste ouverte pour
  // en enchaîner plusieurs, ces id donnent le retour « ajouté » immédiat sans
  // attendre que le parent ait rafraîchi existingBookIds.
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const statusRef = useRef<HTMLDivElement | null>(null)

  async function search(q: string) {
    // Annule les requêtes précédentes encore en vol pour éviter qu'une réponse
    // obsolète n'écrase les résultats d'une recherche plus récente.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const current = () => abortRef.current === controller

    setLoading(true)
    setError(null)
    setPendingFull(true)

    // Recherche à deux vitesses : la requête rapide (Google seul, <1 s) remplit
    // la liste immédiatement ; la requête complète (Google + Open Library, plus
    // lente) la remplace quand elle arrive, comblant les trous de l'index Google.
    const encoded = encodeURIComponent(q)
    const quickReq = fetch(`/api/books/search?q=${encoded}`, { signal: controller.signal })
    const fullReq = fetch(`/api/books/search?q=${encoded}&full=1`, { signal: controller.signal })
    // Les deux requêtes partent en parallèle mais ne sont attendues qu'à la
    // suite. Si la rapide part en AbortError (frappe suivante, fermeture), on
    // sort avant d'avoir attendu la complète : sans ce gestionnaire, son rejet
    // remonterait en unhandledRejection. Le `await` plus bas reste inchangé.
    quickReq.catch(() => {})
    fullReq.catch(() => {})

    let hasResults = false
    const applyResults = (data: unknown) => {
      setResults(Array.isArray(data) ? data : [])
      setFailedCovers(new Set())
      setLoading(false)
      hasResults = true
    }

    try {
      const res = await quickReq
      if (current() && res.ok) applyResults(await res.json())
      // Un échec de la requête rapide n'affiche rien : la complète tranchera.
    } catch (err) {
      if ((err as Error).name === "AbortError") return
    }

    try {
      const res = await fullReq
      if (!current()) return
      if (res.ok) {
        applyResults(await res.json())
      } else if (!hasResults) {
        setResults([])
        setError(res.status === 429 ? "rate_limited" : "generic")
        setLoading(false)
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      if (!hasResults) {
        setResults([])
        setError("generic")
        setLoading(false)
      }
    } finally {
      if (current()) setPendingFull(false)
    }
  }

  function handleQuery(v: string) {
    setQuery(v)
    // Annule le timer précédent avant d'en créer un nouveau
    if (timerRef.current) clearTimeout(timerRef.current)
    if (v.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort()
      setResults([])
      setError(null)
      setLoading(false)
      setPendingFull(false)
      return
    }
    timerRef.current = setTimeout(() => search(v), SEARCH_DEBOUNCE_MS)
  }

  // Toutes les sorties de la modal passent par ici (bouton Terminé, croix, Échap,
  // clic sur l'overlay) : c'est le seul endroit où remettre l'état à zéro, pour
  // que la réouverture reparte vierge — statut compris, qui ne doit jamais être
  // pré-rempli d'une session à l'autre.
  function handleClose() {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    setQuery("")
    setResults([])
    setError(null)
    setFailedCovers(new Set())
    setPendingFull(false)
    setSelectedStatus(null)
    setStatusMissing(false)
    setAddedIds(new Set())
    setAddError(false)
    onClose()
  }

  function pickStatus(value: string) {
    setSelectedStatus(value)
    setStatusMissing(false)
  }

  async function handleAdd(book: BookResult) {
    // Pas de statut choisi : on bloque l'ajout et on ramène l'œil sur le sélecteur.
    if (!selectedStatus) {
      setStatusMissing(true)
      statusRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
      return
    }

    setAdding(book.id)
    setAddError(false)
    // Ne pas persister une URL de couverture dont le chargement a échoué
    // (fallback Open Library en 404) : mieux vaut un placeholder qu'une image cassée.
    const toAdd = failedCovers.has(book.id) ? { ...book, coverUrl: null } : book
    try {
      await onAdd(toAdd, selectedStatus)
      setAddedIds((prev) => new Set(prev).add(book.id))
    } catch {
      setAddError(true)
    } finally {
      setAdding(null)
    }
    // La modal reste ouverte : on enchaîne les ajouts sans la rouvrir à chaque fois.
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un livre</DialogTitle>
        </DialogHeader>

        {/* Sélecteur de statut — obligatoire, sans valeur par défaut */}
        <div
          ref={statusRef}
          className={`flex flex-col gap-2 rounded-xl border p-3 transition-colors ${
            statusMissing
              ? "border-red-500 bg-red-50 dark:border-red-500/70 dark:bg-red-500/10"
              : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]"
          }`}
        >
          <p
            className={`text-xs font-medium ${
              statusMissing ? "text-red-700 dark:text-red-300" : "text-gray-600 dark:text-gray-300"
            }`}
          >
            Statut à appliquer <span className="text-red-600 dark:text-red-400">*</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => pickStatus(s.value)}
                aria-pressed={selectedStatus === s.value}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedStatus === s.value
                    ? "bg-amber-600 border-amber-600 text-white"
                    : statusMissing
                      ? "border-red-400 dark:border-red-500/60 text-red-700 dark:text-red-300 hover:border-red-500"
                      : "border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-white/30"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: selectedStatus === s.value ? "#ffffff" : s.dot }}
                />
                {s.label}
              </button>
            ))}
          </div>
          <p
            className={`text-xs ${
              statusMissing ? "text-red-700 dark:text-red-300 font-medium" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {statusMissing
              ? "Choisis d'abord un statut pour pouvoir ajouter ce livre."
              : "Appliqué aux livres que tu ajoutes ci-dessous. Modifiable à tout moment."}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
          <Input
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Titre, auteur, ISBN…"
            className="pl-9 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]) }}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {loading && (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">Recherche…</p>
          )}
          {!loading && error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">
              {error === "rate_limited"
                ? "Trop de recherches, patientez un instant."
                : "La recherche a échoué. Réessayez dans un instant."}
            </p>
          )}
          {!loading && !error && results.length === 0 && !pendingFull && query.length >= MIN_QUERY_LENGTH && (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">Aucun résultat</p>
          )}
          {!loading && !error && results.length === 0 && pendingFull && (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">Recherche étendue…</p>
          )}
          {results.map((book) => {
            const alreadyAdded =
              addedIds.has(book.id) ||
              !!(
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
                  {book.coverUrl && !failedCovers.has(book.id) && (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      width={40}
                      height={56}
                      className="object-cover w-full h-full"
                      onError={() => setFailedCovers((prev) => new Set(prev).add(book.id))}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{book.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{book.authors.join(", ")}</p>
                  <div className="flex items-center gap-1.5">
                    {book.publishYear && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">{book.publishYear}</p>
                    )}
                    {book.language && (
                      <span className="text-[10px] uppercase px-1 py-px rounded border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-400">
                        {book.language}
                      </span>
                    )}
                  </div>
                </div>
                {alreadyAdded ? (
                  <span
                    title="Déjà dans ta bibliothèque"
                    className="shrink-0 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5"
                  >
                    <Check className="w-4 h-4" />
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAdd(book)}
                    disabled={adding === book.id}
                    aria-label={`Ajouter ${book.title}`}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60"
                  >
                    {adding === book.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            )
          })}
          {!loading && !error && results.length > 0 && pendingFull && (
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center py-2">Recherche étendue en cours…</p>
          )}
        </div>

        {/* Pied : compteur de session + sortie explicite */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {addError ? (
              <span className="text-red-600 dark:text-red-400">L&apos;ajout a échoué. Réessaye.</span>
            ) : addedIds.size > 0 ? (
              `${addedIds.size} livre${addedIds.size > 1 ? "s" : ""} ajouté${addedIds.size > 1 ? "s" : ""}`
            ) : (
              "Tu peux en ajouter plusieurs d'affilée."
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            Terminé
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
