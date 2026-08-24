// Répare les couvertures déjà en base, en réutilisant la cascade de production
// (findBestCoverUrl) plutôt qu'une logique dupliquée. Deux cas traités :
//
//   1. couverture absente (null) ou dont l'URL ne sert pas une vraie image
//      (404 Open Library, placeholder PNG « image not available » de Google) —
//      on relance la cascade complète, dernier recours titre + auteur compris ;
//   2. URL Google encore porteuse de `edge=curl` ou d'un `fife` trop petit —
//      on la repasse en jaquette à plat pleine résolution.
//
// Lancement (esbuild sert juste à exécuter le TypeScript) :
//   npx esbuild scripts/repair-covers.ts --bundle --platform=node --format=esm \
//     --packages=external --outfile=.repair-covers.mjs
//   node --env-file=.env .repair-covers.mjs           (essai à blanc)
//   node --env-file=.env .repair-covers.mjs --apply   (écriture)

import pg from "pg"
import { findBestCoverUrl, googleCoverUrl } from "../lib/books-api"

const APPLY = process.argv.includes("--apply")

type BookRow = {
  id: string
  title: string
  authors: string[]
  isbn: string | null
  googleBooksId: string | null
  coverUrl: string | null
}

// Une vraie jaquette est servie en image/jpeg ; les placeholders Google sortent
// en image/png et les couvertures absentes d'Open Library en 404.
async function isRealCover(url: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    const type = res.headers.get("content-type") ?? ""
    await res.arrayBuffer()
    return res.ok && type.includes("image/jpeg")
  } catch {
    return false
  }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const { rows } = await client.query<BookRow>(
  `SELECT id, title, authors, isbn, "googleBooksId", "coverUrl"
   FROM "Book" ORDER BY "createdAt" DESC`
)

let repaired = 0
let stillMissing = 0
let untouched = 0

for (const book of rows) {
  const isGoogle = book.coverUrl?.includes("books.google.com/books/") ?? false
  const needsFlattening = isGoogle && book.coverUrl !== googleCoverUrl(book.coverUrl!)
  const broken = !book.coverUrl || !(await isRealCover(book.coverUrl))

  if (!broken && !needsFlattening) {
    untouched++
    continue
  }

  // Une URL cassée ne doit pas servir de point de départ à la cascade.
  const next = await findBestCoverUrl({
    coverUrl: broken ? null : book.coverUrl,
    googleBooksId: book.googleBooksId,
    isbn: book.isbn,
    title: book.title,
    authors: book.authors,
  })

  if (!next || next === book.coverUrl) {
    if (broken) {
      console.log(`  SANS   ${book.title.slice(0, 45)} — aucune source n'a de couverture`)
      stillMissing++
      // Une URL cassée laissée en base fait afficher l'image d'erreur du
      // navigateur ou le placeholder PNG de Google ; null rend la main au
      // « 📖 » de l'application.
      if (book.coverUrl && APPLY) {
        await client.query('UPDATE "Book" SET "coverUrl" = NULL WHERE id = $1', [book.id])
      }
    } else {
      untouched++
    }
    continue
  }

  console.log(`  ${APPLY ? "OK   " : "DRY  "} ${book.title.slice(0, 45)}\n         → ${next}`)
  if (APPLY) {
    await client.query('UPDATE "Book" SET "coverUrl" = $1 WHERE id = $2', [next, book.id])
  }
  repaired++
}

console.log(
  `\n${rows.length} livres — ${repaired} ${APPLY ? "réparés" : "à réparer"}, ` +
    `${stillMissing} sans couverture disponible, ${untouched} inchangés.`
)
if (!APPLY) console.log("Essai à blanc : relancer avec --apply pour écrire.")

await client.end()
