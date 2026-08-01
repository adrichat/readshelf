import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/require-auth"
import { parseJsonBody } from "@/lib/api/parse-body"
import { findBestCoverUrl } from "@/lib/books-api"

const VALID_STATUSES = ["READING", "READ", "TO_READ", "ABANDONED"] as const
const VALID_BOOK_TYPES = ["NOVEL", "MANGA", "COMIC"] as const

const PostBodySchema = z.object({
  book: z.object({
    title: z.string().min(1),
    openLibraryId: z.string().nullable().optional(),
    googleBooksId: z.string().nullable().optional(),
    isbn: z.string().nullable().optional(),
    authors: z.array(z.string()).optional(),
    coverUrl: z.string().nullable().optional(),
    publishYear: z.number().nullable().optional(),
    type: z.enum(VALID_BOOK_TYPES).optional(),
  }),
  status: z.enum(VALID_STATUSES).optional(),
  shelfId: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { data, error } = await parseJsonBody(req, PostBodySchema)
  if (error) return error
  const { book, status, shelfId } = data

  // Le livre est effectivement ajouté ici (pas juste affiché dans une liste de
  // résultats) : ça vaut le coût de quelques requêtes pour récupérer et vérifier
  // la meilleure couverture disponible (voir findBestCoverUrl pour la cascade).
  const bestCoverUrl = await findBestCoverUrl({
    coverUrl: book.coverUrl ?? null,
    googleBooksId: book.googleBooksId ?? null,
    isbn: book.isbn ?? null,
  })

  // Déduplication : priorité googleBooksId, puis openLibraryId, sinon création directe
  let savedBook = null
  const bookData = {
    openLibraryId: book.openLibraryId ?? null,
    googleBooksId: book.googleBooksId ?? null,
    isbn: book.isbn ?? null,
    title: book.title,
    authors: book.authors ?? [],
    coverUrl: bestCoverUrl,
    publishYear: book.publishYear ?? null,
    type: (book.type ?? "NOVEL") as "NOVEL" | "MANGA" | "COMIC",
  }

  // Si le livre existe déjà en base (ajouté par ce user ou un autre par le passé),
  // on rafraîchit les champs récupérés avec succès plutôt que de garder pour
  // toujours des données figées au moment de la première insertion (ex: coverUrl
  // resté à null suite à un échec passé de l'API Google Books).
  const updateData = {
    ...(bookData.title && { title: bookData.title }),
    ...(bookData.authors.length > 0 && { authors: bookData.authors }),
    ...(bookData.coverUrl && { coverUrl: bookData.coverUrl }),
    ...(bookData.isbn && { isbn: bookData.isbn }),
    ...(bookData.publishYear && { publishYear: bookData.publishYear }),
  }

  if (book.googleBooksId) {
    savedBook = await db.book.upsert({
      where: { googleBooksId: book.googleBooksId },
      update: updateData,
      create: bookData,
    })
  } else if (book.openLibraryId) {
    savedBook = await db.book.upsert({
      where: { openLibraryId: book.openLibraryId },
      update: updateData,
      create: bookData,
    })
  } else {
    savedBook = await db.book.create({ data: bookData })
  }

  const userBook = await db.userBook.upsert({
    where: { userId_bookId: { userId: session.user.id, bookId: savedBook.id } },
    update: { status: status ?? "TO_READ", shelfId: shelfId ?? null },
    create: {
      userId: session.user.id,
      bookId: savedBook.id,
      status: status ?? "TO_READ",
      shelfId: shelfId ?? null,
    },
  })

  return NextResponse.json({ ...userBook, book: savedBook })
}

const PatchBodySchema = z.object({
  userBookId: z.string().min(1),
  isFavorite: z.boolean().optional(),
  status: z.enum(VALID_STATUSES).optional(),
})

const DeleteBodySchema = z.object({
  userBookId: z.string().min(1),
})

export async function PATCH(req: NextRequest) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { data, error } = await parseJsonBody(req, PatchBodySchema)
  if (error) return error
  const { userBookId, isFavorite, status } = data

  const existing = await db.userBook.findUnique({
    where: { id: userBookId, userId: session.user.id },
    select: { isFavorite: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  // Si on ajoute un favori (pas juste un re-toggle idempotent), on lui assigne
  // explicitement un `order` en fin de liste. Sans ça, `order` reste à sa valeur
  // par défaut (0) pour tous les livres jamais glissés dans la zone favoris, ce
  // qui les fait entrer en collision et se départager par `addedAt` au lieu de
  // s'ajouter après les favoris existants.
  let orderUpdate: { order?: number } = {}

  if (isFavorite && !existing.isFavorite) {
    const agg = await db.userBook.aggregate({
      where: { userId: session.user.id, isFavorite: true },
      _count: true,
      _max: { order: true },
    })
    if (agg._count >= 4) {
      return NextResponse.json({ error: "MAX_FAVORITES" }, { status: 400 })
    }
    orderUpdate = { order: (agg._max.order ?? -1) + 1 }
  }

  const updated = await db.userBook.update({
    where: { id: userBookId, userId: session.user.id },
    data: {
      ...(isFavorite !== undefined && { isFavorite }),
      ...(status !== undefined && { status }),
      ...orderUpdate,
    },
    include: { book: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { data, error } = await parseJsonBody(req, DeleteBodySchema)
  if (error) return error
  const { userBookId } = data

  const existing = await db.userBook.findUnique({
    where: { id: userBookId, userId: session.user.id },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  await db.userBook.delete({
    where: { id: userBookId, userId: session.user.id },
  })

  return NextResponse.json({ success: true })
}
