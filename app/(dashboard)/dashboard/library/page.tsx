import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { LibraryClient } from "./LibraryClient"

// La bibliothèque est désormais rendue côté serveur avec ses données : la page
// était un composant client qui n'allait chercher /api/userbooks/list qu'après
// le téléchargement et l'hydratation de son bundle — l'utilisateur voyait un
// écran de chargement le temps de trois allers-retours enchaînés.
export default async function LibraryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userBooks = await db.userBook.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "desc" },
    select: {
      id: true,
      status: true,
      rating: true,
      isFavorite: true,
      order: true,
      book: {
        select: {
          id: true,
          title: true,
          authors: true,
          coverUrl: true,
          type: true,
          googleBooksId: true,
          openLibraryId: true,
        },
      },
    },
  })

  return <LibraryClient initialBooks={userBooks} />
}
