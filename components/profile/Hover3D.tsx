"use client"

import { useRef, type ReactNode } from "react"
import { useMediaQuery } from "@/lib/use-media-query"
import { useCoverViewer, type CoverPreview } from "./CoverViewer"

interface Hover3DProps {
  /** Élément unique : la couverture (ou boîte de couverture) à incliner */
  children: ReactNode
  /** Ajoute le voile holographique (réservé aux livres préférés) */
  holo?: boolean
  className?: string
  /**
   * Livre décrit pour l'aperçu plein écran tactile. Sans lui (ou hors
   * CoverViewerProvider), la couverture reste un simple visuel au survol.
   */
  cover?: Omit<CoverPreview, "holo">
}

const MAX_TILT_DEG = 14

/**
 * Effet de bascule 3D + reflet, suivant la souris pixel par pixel (pas de
 * zones de survol discrètes) : chaque mousemove pousse directement les
 * variables CSS --rx/--ry (inclinaison) et --px/--py (position du reflet)
 * sur l'élément, sans passer par le re-rendu React. Voir app/globals.css
 * (.hover-3d / .holo).
 *
 * Au doigt il n'y a pas de survol : sur écran tactile, un tap ouvre la
 * couverture en grand (CoverViewer) où c'est le pouce qui l'incline.
 */
export function Hover3D({ children, holo = false, className = "", cover }: Hover3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const openCover = useCoverViewer()
  const isTouch = useMediaQuery("(hover: none)")
  const tappable = isTouch && !!cover && !!openCover

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rx = (0.5 - py) * 2 * MAX_TILT_DEG
    const ry = (px - 0.5) * 2 * MAX_TILT_DEG

    el.style.setProperty("--tilt-speed", "0s")
    el.style.setProperty("--rx", `${rx}deg`)
    el.style.setProperty("--ry", `${ry}deg`)
    el.style.setProperty("--px", `${px * 100}%`)
    el.style.setProperty("--py", `${py * 100}%`)
  }

  const handleLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--tilt-speed", ".4s")
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--ry", "0deg")
    el.style.setProperty("--px", "50%")
    el.style.setProperty("--py", "50%")
  }

  const open = () => {
    if (cover && openCover) openCover({ ...cover, holo })
  }

  return (
    <div
      ref={ref}
      className={`hover-3d ${holo ? "holo" : ""} ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      {...(tappable
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": `Agrandir la couverture de ${cover!.title}`,
            onClick: open,
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                open()
              }
            },
          }
        : {})}
    >
      {children}
    </div>
  )
}
