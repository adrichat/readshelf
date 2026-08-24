"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { STATUS_CONFIG } from "@/lib/book-status"

export interface CoverPreview {
  title: string
  authors?: string[]
  coverUrl: string | null
  status?: string | null
  /** Voile holographique — réservé aux livres préférés */
  holo?: boolean
}

const CoverViewerContext = createContext<((cover: CoverPreview) => void) | null>(null)

/** null hors provider : la couverture reste alors un simple visuel au survol */
export function useCoverViewer() {
  return useContext(CoverViewerContext)
}

/**
 * Aperçu plein écran d'une couverture, pour les écrans tactiles où le survol
 * n'existe pas : on tape une couverture, elle s'ouvre en grand, et le pouce
 * la fait pivoter (voile holographique pour les préférés, simple reflet
 * sinon). Sur desktop l'effet reste au survol, dans Hover3D.
 */
export function CoverViewerProvider({
  children,
  accentColor = "#d97706",
}: {
  children: ReactNode
  accentColor?: string
}) {
  const [cover, setCover] = useState<CoverPreview | null>(null)
  const open = useCallback((c: CoverPreview) => setCover(c), [])
  const close = useCallback(() => setCover(null), [])

  return (
    <CoverViewerContext.Provider value={open}>
      {children}
      <AnimatePresence>
        {cover && <CoverOverlay cover={cover} accentColor={accentColor} onClose={close} />}
      </AnimatePresence>
    </CoverViewerContext.Provider>
  )
}

// Amplitude volontairement plus large qu'au survol : le geste au pouce est
// plus court et moins précis qu'un déplacement de souris.
const MAX_TILT_DEG = 24
// Course du doigt (en fraction de la couverture) pour atteindre l'inclinaison max
const TRAVEL = 0.8
// En deçà, le geste est un tap (fermeture) et non une rotation
const TAP_SLOP_PX = 8

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}

function CoverOverlay({
  cover,
  accentColor,
  onClose,
}: {
  cover: CoverPreview
  accentColor: string
  onClose: () => void
}) {
  const tiltRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; moved: boolean; onCover: boolean } | null>(null)

  // Le profil ne doit pas défiler sous l'aperçu pendant qu'on fait pivoter
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const tiltTo = (clientX: number, clientY: number) => {
    const tilt = tiltRef.current
    const box = boxRef.current
    if (!tilt || !box) return
    const rect = box.getBoundingClientRect()
    const nx = clamp((clientX - (rect.left + rect.width / 2)) / (rect.width * TRAVEL), -1, 1)
    const ny = clamp((clientY - (rect.top + rect.height / 2)) / (rect.height * TRAVEL), -1, 1)

    tilt.style.setProperty("--tilt-speed", "0s")
    tilt.style.setProperty("--rx", `${-ny * MAX_TILT_DEG}deg`)
    tilt.style.setProperty("--ry", `${nx * MAX_TILT_DEG}deg`)
    tilt.style.setProperty("--px", `${(nx * 0.5 + 0.5) * 100}%`)
    tilt.style.setProperty("--py", `${(ny * 0.5 + 0.5) * 100}%`)
  }

  const rest = () => {
    const tilt = tiltRef.current
    if (!tilt) return
    tilt.style.setProperty("--tilt-speed", ".5s")
    tilt.style.setProperty("--rx", "0deg")
    tilt.style.setProperty("--ry", "0deg")
    tilt.style.setProperty("--px", "50%")
    tilt.style.setProperty("--py", "50%")
  }

  const handleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = boxRef.current?.getBoundingClientRect()
    const onCover =
      !!rect &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false, onCover }
    tiltTo(e.clientX, e.clientY)
  }

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > TAP_SLOP_PX) drag.moved = true
    tiltTo(e.clientX, e.clientY)
  }

  const handleUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    rest()
    // Tap sec en dehors de la couverture : on referme. Sur la couverture, le
    // tap ne fait que l'incliner brièvement.
    if (drag && !drag.moved && !drag.onCover) onClose()
  }

  const status = cover.status && STATUS_CONFIG[cover.status] ? STATUS_CONFIG[cover.status] : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      // touch-action: none — sans ça le geste de rotation ferait défiler la page
      style={{
        touchAction: "none",
        background: "rgba(6,6,10,0.86)",
        backdropFilter: "blur(14px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={cover.title}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 rounded-full border text-white/80"
        style={{ borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        // Bornée en hauteur aussi (48dvh × 3/2 = 72dvh) pour garder le titre visible
        style={{ width: "min(74vw, 340px, 48dvh)" }}
      >
        <div
          ref={tiltRef}
          className={`hover-3d tilt-active ${cover.holo ? "holo" : ""}`}
          style={{ perspective: "60rem" }}
        >
          <div
            ref={boxRef}
            className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden"
            style={{ boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}30` }}
          >
            {cover.coverUrl ? (
              <Image
                src={cover.coverUrl}
                alt={cover.title}
                fill
                className="object-cover select-none"
                sizes="340px"
                draggable={false}
                priority
              />
            ) : (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}08)` }}
              >
                <div className="text-5xl mb-3">📖</div>
                <p className="text-sm text-white/85 leading-tight">{cover.title}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="mt-6 text-center max-w-xs pointer-events-none">
        <p className="text-base font-semibold text-white leading-snug">{cover.title}</p>
        {cover.authors?.[0] && <p className="text-sm text-white/60 mt-0.5">{cover.authors[0]}</p>}
        {status && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <span className="text-xs" style={{ color: status.color }}>
              {status.label}
            </span>
          </div>
        )}
        <p className="text-xs text-white/35 mt-5">Glisse ton doigt pour faire pivoter la couverture</p>
      </div>
    </motion.div>
  )
}
