"use client"

import { useRef, type ReactNode } from "react"

interface Hover3DProps {
  /** Élément unique : la couverture (ou boîte de couverture) à incliner */
  children: ReactNode
  /** Ajoute le voile holographique (réservé aux livres préférés) */
  holo?: boolean
  className?: string
}

const MAX_TILT_DEG = 14

/**
 * Effet de bascule 3D + reflet, suivant la souris pixel par pixel (pas de
 * zones de survol discrètes) : chaque mousemove pousse directement les
 * variables CSS --rx/--ry (inclinaison) et --px/--py (position du reflet)
 * sur l'élément, sans passer par le re-rendu React. Voir app/globals.css
 * (.hover-3d / .holo).
 */
export function Hover3D({ children, holo = false, className = "" }: Hover3DProps) {
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div
      ref={ref}
      className={`hover-3d ${holo ? "holo" : ""} ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  )
}
