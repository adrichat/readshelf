"use client"

import { useMemo } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { STATUS_CONFIG } from "./BookCard"
import { useMediaQuery } from "@/lib/use-media-query"

interface Book {
  id: string
  title: string
  authors: string[]
  coverUrl: string | null
  rating: number | null
  status?: string
}

interface LibraryShelvesProps {
  books: Book[]
  shelfColor?: string
  accentColor?: string
}

const PER_SHELF_DESKTOP = 5
const PER_SHELF_MOBILE = 3 // couvertures plus grandes sur petit écran
const COVER_GAP = 16
const PLANK = 16 // épaisseur du bois entre les niches

function shade(hex: string, factor: number): string {
  const h = hex.replace("#", "")
  const c = (i: number) =>
    Math.min(255, Math.max(0, Math.round(parseInt(h.slice(i, i + 2), 16) * factor)))
  return `rgb(${c(0)},${c(2)},${c(4)})`
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function LibraryShelves({ books, shelfColor = "#7a4518", accentColor = "#d97706" }: LibraryShelvesProps) {
  const isMobile = useMediaQuery("(max-width: 639px)")
  const perShelf = isMobile ? PER_SHELF_MOBILE : PER_SHELF_DESKTOP
  const shelves = useMemo(() => chunk(books, perShelf), [books, perShelf])

  // Le meuble est une structure de bois pleine ; chaque rangée est une niche creusée dedans.
  const wood = {
    frameLight: shade(shelfColor, 1.3),
    frame: shade(shelfColor, 1.0),
    frameDark: shade(shelfColor, 0.65),
    inside: shade(shelfColor, 0.45),
    insideDark: shade(shelfColor, 0.3),
  }

  // Largeur fluide selon le nombre de couvertures par rangée
  const coverWidth = `calc((100% - ${(perShelf - 1) * COVER_GAP}px) / ${perShelf})`

  return (
    <div className="w-full">
      {/* Structure du meuble */}
      <div
        style={{
          background: `linear-gradient(180deg, ${wood.frameLight} 0%, ${wood.frame} 25%, ${wood.frameDark} 100%)`,
          borderRadius: 14,
          padding: PLANK,
          display: "flex",
          flexDirection: "column",
          gap: PLANK,
          boxShadow: "0 16px 44px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)",
        }}
      >
        {shelves.map((row, si) => (
          <div
            key={si}
            style={{
              background: `linear-gradient(180deg, ${wood.insideDark} 0%, ${wood.inside} 70%)`,
              borderRadius: 6,
              boxShadow:
                "inset 0 8px 18px rgba(0,0,0,0.5), inset 4px 0 10px rgba(0,0,0,0.3), inset -4px 0 10px rgba(0,0,0,0.3)",
              padding: "16px 16px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: COVER_GAP,
              }}
            >
              {row.map((book, bi) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (si * perShelf + bi) * 0.03, duration: 0.35, ease: "easeOut" }}
                  whileHover={{ y: -6 }}
                  className="relative group cursor-pointer"
                  style={{ width: coverWidth, flexShrink: 0 }}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{
                      aspectRatio: "2/3",
                      borderRadius: "3px 3px 0 0",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      boxShadow: "3px 0 12px rgba(0,0,0,0.5)",
                    }}
                  >
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 30vw, (max-width: 768px) 20vw, 180px"
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center p-2"
                        style={{ background: `linear-gradient(160deg, ${wood.inside}, ${wood.insideDark})` }}
                      >
                        <p className="text-[11px] text-white/75 text-center leading-tight line-clamp-4">
                          {book.title}
                        </p>
                      </div>
                    )}

                    {/* Overlay au survol */}
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col justify-end p-2">
                      <p className="text-xs text-white font-medium leading-tight line-clamp-3">{book.title}</p>
                      {book.authors[0] && (
                        <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: accentColor }}>
                          {book.authors[0]}
                        </p>
                      )}
                      {book.rating != null && (
                        <p className="text-[10px] text-yellow-400 mt-0.5">{"★".repeat(book.rating)}</p>
                      )}
                    </div>

                    {/* Statut — visible par défaut, placé après l'overlay pour rester lisible au survol */}
                    {book.status && STATUS_CONFIG[book.status] && (
                      <div
                        className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full max-w-[calc(100%-8px)]"
                        style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_CONFIG[book.status].color }}
                        />
                        <span className="text-[10px] leading-none text-white/90 truncate">
                          {STATUS_CONFIG[book.status].label}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pieds — même bois que la structure */}
      <div className="flex justify-between" style={{ padding: "0 30px" }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: 42,
              height: 18,
              background: `linear-gradient(180deg, ${wood.frameDark} 0%, ${shade(shelfColor, 0.45)} 100%)`,
              borderRadius: "0 0 6px 6px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.45)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
