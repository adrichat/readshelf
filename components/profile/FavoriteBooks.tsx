import Image from "next/image"
import { foregroundFor, type ProfileFg } from "@/lib/profile-colors"

interface FavoriteBook {
  id: string
  title: string
  authors: string[]
  coverUrl: string | null
}

interface FavoriteBooksProps {
  books: FavoriteBook[]
  accentColor?: string
  /** Accent déjà résolu pour rester lisible sur le fond (sinon accentColor) */
  accentText?: string
  fg?: ProfileFg
}

export function FavoriteBooks({
  books,
  accentColor = "#7c3aed",
  accentText = accentColor,
  fg = foregroundFor(0),
}: FavoriteBooksProps) {
  if (books.length === 0) return null

  // Toujours afficher 4 slots
  const slots = Array.from({ length: 4 }, (_, i) => books[i] ?? null)

  return (
    <section className="mb-8 sm:mb-14">
      <div className="flex items-center gap-4 mb-4 sm:mb-6">
        <h2
          className="text-xs font-bold uppercase tracking-widest shrink-0"
          style={{ color: accentText }}
        >
          Livres préférés
        </h2>
        <div
          className="flex-1 h-px"
          style={{ background: `linear-gradient(to right, ${accentText}30, transparent)` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {slots.map((book, i) =>
          book ? (
            <div key={book.id} className="group relative flex flex-col gap-2">
              <div
                className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-transform duration-200 group-hover:-translate-y-1"
                style={{ boxShadow: `0 4px 24px ${accentColor}20` }}
              >
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 25vw, (max-width: 1024px) 15vw, 200px"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center"
                    style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)` }}
                  >
                    <div className="text-3xl mb-2">📖</div>
                    <p className="text-xs line-clamp-2 leading-tight" style={{ color: fg.body }}>{book.title}</p>
                  </div>
                )}

                {/* Overlay titre au hover */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-xs text-white font-semibold line-clamp-2 leading-snug">{book.title}</p>
                  {book.authors[0] && (
                    <p className="text-xs mt-1" style={{ color: `${accentColor}cc` }}>{book.authors[0]}</p>
                  )}
                </div>
              </div>
              <p className="text-xs line-clamp-1 font-medium" style={{ color: fg.body }}>{book.title}</p>
            </div>
          ) : (
            <div
              key={`empty-${i}`}
              className="relative w-full aspect-[2/3] rounded-xl border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: `${accentText}20` }}
            >
              <span className="text-2xl opacity-20" style={{ color: fg.heading }}>+</span>
            </div>
          )
        )}
      </div>
    </section>
  )
}
