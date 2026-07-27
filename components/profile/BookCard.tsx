"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { foregroundFor, type ProfileFg } from "@/lib/profile-colors"

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  READING:   { label: "En cours",   color: "#60a5fa" },
  READ:      { label: "Lu",         color: "#4ade80" },
  TO_READ:   { label: "À lire",     color: "#9ca3af" },
  ABANDONED: { label: "Abandonné",  color: "#f87171" },
}

// Variantes plus soutenues, lisibles sur fond de profil clair
const STATUS_COLORS_ON_LIGHT: Record<string, string> = {
  READING:   "#1d4ed8",
  READ:      "#15803d",
  TO_READ:   "#475569",
  ABANDONED: "#b91c1c",
}

interface BookCardProps {
  title: string
  authors: string[]
  coverUrl: string | null
  rating?: number | null
  type?: string
  status?: string
  index?: number
  accentColor?: string
  fg?: ProfileFg
}

const TYPE_LABELS: Record<string, string> = {
  NOVEL: "Roman",
  MANGA: "Manga",
  COMIC: "BD",
}

export function BookCard({
  title,
  authors,
  coverUrl,
  rating,
  type,
  status,
  index = 0,
  accentColor = "#d97706",
  fg = foregroundFor(0),
}: BookCardProps) {
  const statusColor =
    status && STATUS_CONFIG[status]
      ? fg.light
        ? STATUS_COLORS_ON_LIGHT[status]
        : STATUS_CONFIG[status].color
      : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
      className="group flex flex-col gap-2"
    >
      <motion.div
        whileHover={{ y: -6, boxShadow: `0 16px 40px ${accentColor}35` }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-md cursor-pointer"
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 160px"
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center"
            style={{ background: `linear-gradient(135deg, ${accentColor}15, transparent)` }}
          >
            <div className="text-3xl mb-2">📖</div>
            <p className="text-xs line-clamp-3 leading-tight" style={{ color: fg.body }}>{title}</p>
          </div>
        )}

        {/* Overlay info on hover */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2">
          <p className="text-xs text-white font-medium line-clamp-2 leading-tight">{title}</p>
          {authors[0] && <p className="text-xs mt-0.5" style={{ color: `${accentColor}cc` }}>{authors[0]}</p>}
          {rating && (
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-xs">{i < rating ? "★" : "☆"}</span>
              ))}
            </div>
          )}
        </div>

        {/* Type badge */}
        {type && type !== "NOVEL" && (
          <div
            className="absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded text-white font-medium"
            style={{ backgroundColor: `${accentColor}cc` }}
          >
            {TYPE_LABELS[type] ?? type}
          </div>
        )}
      </motion.div>

      {/* Title below cover */}
      <p className="text-xs line-clamp-1 leading-tight font-medium" style={{ color: fg.body }}>{title}</p>
      {authors[0] && <p className="text-xs line-clamp-1 -mt-1" style={{ color: fg.muted }}>{authors[0]}</p>}
      {status && statusColor && (
        <div className="flex items-center gap-1 -mt-0.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs leading-none" style={{ color: statusColor, opacity: 0.85 }}>
            {STATUS_CONFIG[status].label}
          </span>
        </div>
      )}
    </motion.div>
  )
}
