"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { foregroundFor, type ProfileFg } from "@/lib/profile-colors"
import { STATUS_CONFIG, STATUS_COLORS_ON_LIGHT } from "@/lib/book-status"
import { Hover3D } from "./Hover3D"

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
      className="flex flex-col gap-2"
    >
      <Hover3D cover={{ title, authors, coverUrl, status }}>
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-md cursor-pointer">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 160px"
              // Les premières couvertures sont au-dessus de la ligne de flottaison :
              // sans priority, Next les charge en lazy et signale un LCP tardif.
              priority={index < 6}
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

          {/* Type badge */}
          {type && type !== "NOVEL" && (
            <div
              className="absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded text-white font-medium"
              style={{ backgroundColor: `${accentColor}cc` }}
            >
              {TYPE_LABELS[type] ?? type}
            </div>
          )}
        </div>
      </Hover3D>

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
