import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getHighResCoverUrl } from "@/lib/books-api"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { book, status, shelfId } = await req.json()
  if (!book?.title) {
    return NextResponse.json({ error: "Invalid book data" }, { status: 400 })
  }

  // Le livre est effectivement ajouté ici (pas juste affiché dans une liste de
  // résultats) : ça vaut le coût d'un appel API dédié pour tenter de récupérer
  // une couverture en meilleure résolution que celle de la recherche.
  const hdCoverUrl = book.googleBooksId ? await getHighResCoverUrl(book.googleBooksId) : null

  // Déduplication : priorité googleBooksId, puis openLibraryId, sinon création directe
  let savedBook = null
  const bookData = {
    openLibraryId: book.openLibraryId ?? null,
    googleBooksId: book.googleBooksId ?? null,
    isbn: book.isbn ?? null,
    title: book.title,
    authors: book.authors ?? [],
    coverUrl: hdCoverUrl ?? book.coverUrl ?? null,
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

const VALID_STATUSES = ["READING", "READ", "TO_READ", "ABANDONED"] as const
type ValidStatus = (typeof VALID_STATUSES)[number]

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userBookId, isFavorite, status } = await req.json()

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 })
  }

  if (isFavorite) {
    const count = await db.userBook.count({
      where: { userId: session.user.id, isFavorite: true },
    })
    if (count >= 4) {
      return NextResponse.json({ error: "MAX_FAVORITES" }, { status: 400 })
    }
  }

  const updated = await db.userBook.update({
    where: { id: userBookId, userId: session.user.id },
    data: {
      ...(isFavorite !== undefined && { isFavorite }),
      ...(status !== undefined && { status: status as ValidStatus }),
    },
    include: { book: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userBookId } = await req.json()
  await db.userBook.delete({
    where: { id: userBookId, userId: session.user.id },
  })

  return NextResponse.json({ success: true })
}
