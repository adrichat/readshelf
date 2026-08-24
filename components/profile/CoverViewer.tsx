"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import Image from "next/image"
import { STATUS_CONFIG } from "@/lib/book-status"

export interface CoverPreview {
  title: string
  authors?: string[]
  coverUrl: string | null
  status?: string | null
  /** Voile holographique — réservé aux livres préférés */
  holo?: boolean
  /**
   * Image déjà affichée (et donc déjà en cache) dans la vignette. L'aperçu
   * demande une taille différente, qui part en réseau : sans ce calque
   * immédiat la couverture volerait vide jusqu'à ce qu'il arrive.
   */
  previewSrc?: string | null
}

/** `origin` : la vignette d'où part (et où revient) l'agrandissement */
type OpenCover = (cover: CoverPreview, origin?: HTMLElement | null) => void

const CoverViewerContext = createContext<OpenCover | null>(null)

/** null hors provider : la couverture reste alors un simple visuel au survol */
export function useCoverViewer() {
  return useContext(CoverViewerContext)
}

/**
 * Aperçu plein écran d'une couverture, pour les écrans tactiles où le survol
 * n'existe pas : on tape une couverture, elle grandit depuis sa place dans la
 * grille jusqu'au centre de l'écran, et le pouce la fait pivoter (voile
 * holographique pour les préférés, simple reflet sinon). Sur desktop l'effet
 * reste au survol, dans Hover3D.
 */
export function CoverViewerProvider({
  children,
  accentColor = "#d97706",
}: {
  children: ReactNode
  accentColor?: string
}) {
  const [open, setOpen] = useState<{ cover: CoverPreview; origin: HTMLElement | null } | null>(null)

  const openCover = useCallback<OpenCover>(
    (cover, origin) => setOpen({ cover, origin: origin ?? null }),
    []
  )
  const closed = useCallback(() => setOpen(null), [])

  return (
    <CoverViewerContext.Provider value={openCover}>
      {children}
      {open && (
        <CoverOverlay
          cover={open.cover}
          origin={open.origin}
          accentColor={accentColor}
          onClosed={closed}
        />
      )}
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

const OPEN_MS = 460
const CLOSE_MS = 340
/** Retour à plat au relâchement du doigt */
const REST_MS = 500
// Léger dépassement à l'ouverture, franc et sans rebond à la fermeture
const OPEN_EASE = "cubic-bezier(.34, 1.4, .64, 1)"
const CLOSE_EASE = "cubic-bezier(.4, 0, .2, 1)"
const BACKDROP_BLUR = "blur(12px)"
/** Opacité du voile holo une fois la couverture ouverte */
const HOLO_OPACITY = 0.6
// Mêmes dégradés que .hover-3d/.holo dans globals.css : ici ce sont de vrais
// calques et non des pseudo-éléments, pour que leur opacité puisse être
// animée exactement sur le vol de la couverture.
const SHEEN_GRADIENT =
  "radial-gradient(circle at var(--px) var(--py), rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)"
const HOLO_GRADIENT =
  "linear-gradient(115deg, transparent 20%, #ff5ecb 32%, #7dd3fc 40%, #a78bfa 48%, #facc15 56%, #34d399 64%, transparent 76%)"

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}

/**
 * Transform amenant l'aperçu — décrit par `to`, sa place finale à l'écran —
 * exactement sur la vignette d'origine. Sert dans les deux sens : on part de
 * là à l'ouverture, on y revient à la fermeture. null si la vignette a
 * disparu entre-temps.
 *
 * `to` est mesuré une fois pour toutes avant la première animation : mesurer
 * l'élément en vol donnerait le rectangle déjà transformé, donc un calcul faux
 * si on referme au milieu de l'agrandissement.
 */
function transformOnto(origin: HTMLElement | null, to: DOMRect | null): string | null {
  if (!origin || !to || !to.width) return null
  const from = origin.getBoundingClientRect()
  if (!from.width) return null
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  return `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`
}

function CoverOverlay({
  cover,
  origin,
  accentColor,
  onClosed,
}: {
  cover: CoverPreview
  origin: HTMLElement | null
  accentColor: string
  onClosed: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; moved: boolean; onCover: boolean } | null>(null)
  const closingRef = useRef(false)
  const flightRef = useRef<Animation | null>(null)
  const sheenRef = useRef<HTMLDivElement>(null)
  const holoRef = useRef<HTMLDivElement>(null)
  const finalRect = useRef<DOMRect | null>(null)
  const [hiResLoaded, setHiResLoaded] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // Le profil ne doit pas défiler sous l'aperçu pendant qu'on fait pivoter —
  // et la vignette d'origine doit rester où elle est pour le retour
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const setChrome = (visible: boolean, delayMs = 0) => {
    for (const el of [closeRef.current, captionRef.current]) {
      if (!el) continue
      el.style.transition = `opacity 220ms ease-out ${delayMs}ms`
      el.style.opacity = visible ? "1" : "0"
    }
  }

  /**
   * Allume (1) ou éteint (0) reflet et voile holo, sur la même durée que le
   * vol de la couverture : ils montent pendant l'agrandissement et
   * redescendent pendant le retour, aux mêmes pourcentages.
   */
  const fadeSheen = (to: number, ms: number, easing: string) => {
    const layers: [HTMLDivElement | null, number][] = [
      [sheenRef.current, 1],
      [holoRef.current, HOLO_OPACITY],
    ]
    for (const [el, max] of layers) {
      if (!el) continue
      el.animate(
        // Repart de l'opacité courante : refermer en plein agrandissement
        // n'écrase pas le fondu en cours
        [{ opacity: getComputedStyle(el).opacity }, { opacity: `${to * max}` }],
        { duration: ms, easing, fill: "both" }
      )
    }
  }

  /** Remet la carte — et avec elle le voile holo — droite en `ms` */
  const straighten = (ms: number) => {
    const tilt = tiltRef.current
    if (!tilt) return
    tilt.style.setProperty("--tilt-speed", `${ms}ms`)
    tilt.style.setProperty("--rx", "0deg")
    tilt.style.setProperty("--ry", "0deg")
    tilt.style.setProperty("--px", "50%")
    tilt.style.setProperty("--py", "50%")
  }

  // Ouverture : la couverture grandit depuis sa vignette jusqu'au centre.
  // Animation WAAPI plutôt que transition CSS : sur un élément qui vient
  // d'apparaître, une transition ne se déclenche pas de façon fiable (il n'y a
  // pas d'état « avant ») et l'agrandissement se faisait d'un coup.
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    finalRect.current = wrap.getBoundingClientRect()
    const from = transformOnto(origin, finalRect.current)

    setChrome(false)
    flightRef.current = wrap.animate(
      [
        { transform: from ?? "scale(.86)", opacity: from ? 1 : 0 },
        { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
      ],
      { duration: OPEN_MS, easing: OPEN_EASE, fill: "both" }
    )
    fadeSheen(1, OPEN_MS, "ease-out")
    if (backdropRef.current) backdropRef.current.style.opacity = "1"
    setChrome(true, 120)

    // backdrop-filter re-floute tout l'écran à chaque image : appliqué
    // pendant le vol, il hache l'agrandissement. On attend l'atterrissage.
    const blurTimer = window.setTimeout(() => {
      const backdrop = backdropRef.current
      if (!backdrop) return
      backdrop.style.transition = "backdrop-filter 220ms ease-out"
      backdrop.style.backdropFilter = BACKDROP_BLUR
    }, OPEN_MS)
    return () => window.clearTimeout(blurTimer)
    // Une seule fois, à l'ouverture — l'aperçu est remonté à chaque couverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fermeture : la couverture retourne se poser sur sa vignette
  const startClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    dragRef.current = null

    // Droite au moment précis où elle se repose, et reflet + voile holo
    // éteints en fondu sur toute la durée du retour
    straighten(CLOSE_MS)
    fadeSheen(0, CLOSE_MS, "ease-in")

    const wrap = wrapRef.current
    if (wrap) {
      // Repart d'où elle en est, même si on referme en plein agrandissement
      const current = getComputedStyle(wrap).transform
      const back = transformOnto(origin, finalRect.current)
      flightRef.current?.cancel()
      flightRef.current = wrap.animate(
        [
          { transform: current === "none" ? "translate(0px, 0px) scale(1)" : current, opacity: 1 },
          { transform: back ?? "scale(.9)", opacity: back ? 1 : 0 },
        ],
        { duration: CLOSE_MS, easing: CLOSE_EASE, fill: "both" }
      )
    }
    const backdrop = backdropRef.current
    if (backdrop) {
      // Flou coupé net (invisible sous un voile à 86 %) plutôt que transitionné :
      // le refloutage image par image saccaderait le retour
      backdrop.style.transition = `opacity ${CLOSE_MS}ms ease-in`
      backdrop.style.backdropFilter = "blur(0px)"
      backdrop.style.opacity = "0"
    }
    setChrome(false)

    closeTimer.current = window.setTimeout(onClosed, CLOSE_MS)
  }, [origin, onClosed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") startClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [startClose])

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

  const handleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (closingRef.current) return
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
    if (!drag || closingRef.current) return
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > TAP_SLOP_PX) drag.moved = true
    tiltTo(e.clientX, e.clientY)
  }

  const handleUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (closingRef.current) return
    // Tap sec en dehors de la couverture : elle retourne à sa place. Sinon on
    // relâche simplement le geste, et tout se redresse en douceur.
    if (drag && !drag.moved && !drag.onCover) startClose()
    else straighten(REST_MS)
  }

  const status = cover.status && STATUS_CONFIG[cover.status] ? STATUS_CONFIG[cover.status] : null

  return (
    <div
      className="fixed inset-0 z-50"
      // touch-action: none — sans ça le geste de rotation ferait défiler la page
      style={{ touchAction: "none" }}
      role="dialog"
      aria-modal="true"
      aria-label={cover.title}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {/* Voile à part de la couverture : il se fond pendant qu'elle, se
          déplace — sinon elle apparaîtrait en fondu au lieu de grandir */}
      <div
        ref={backdropRef}
        className="absolute inset-0"
        style={{
          opacity: 0,
          transition: "opacity 260ms ease-out",
          background: "rgba(6,6,10,0.86)",
          backdropFilter: "blur(0px)",
        }}
      />

      <button
        ref={closeRef}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={startClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 rounded-full border text-white/80"
        style={{
          opacity: 0,
          borderColor: "rgba(255,255,255,0.2)",
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <div
          ref={wrapRef}
          // Bornée en hauteur aussi (48dvh × 3/2 = 72dvh) pour garder le titre visible
          style={{ width: "min(74vw, 340px, 48dvh)", willChange: "transform" }}
        >
          <div
            ref={tiltRef}
            className="hover-3d"
            style={{ perspective: "60rem" }}
          >
            <div
              ref={boxRef}
              className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden"
              style={{ boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}30` }}
            >
              {cover.previewSrc && (
                // Vignette déjà en cache : la couverture est pleine dès la
                // première image de l'agrandissement
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.previewSrc}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover select-none"
                />
              )}
              {cover.coverUrl ? (
                <Image
                  src={cover.coverUrl}
                  alt={cover.title}
                  fill
                  className="object-cover select-none"
                  sizes="340px"
                  draggable={false}
                  priority
                  onLoad={() => setHiResLoaded(true)}
                  style={{
                    opacity: cover.previewSrc && !hiResLoaded ? 0 : 1,
                    transition: "opacity 240ms ease-out",
                  }}
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

              {/* Reflet, puis voile holo pour les préférés — --px/--py les
                  déplacent au doigt, leur opacité suit l'agrandissement */}
              <div
                ref={sheenRef}
                aria-hidden
                className="absolute inset-0 z-10 pointer-events-none"
                style={{ opacity: 0, backgroundImage: SHEEN_GRADIENT }}
              />
              {cover.holo && (
                <div
                  ref={holoRef}
                  aria-hidden
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{
                    opacity: 0,
                    mixBlendMode: "color-dodge",
                    backgroundImage: HOLO_GRADIENT,
                    backgroundSize: "250% 250%",
                    backgroundPosition: "var(--px) var(--py)",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div
          ref={captionRef}
          className="mt-6 text-center max-w-xs pointer-events-none"
          style={{ opacity: 0 }}
        >
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
      </div>
    </div>
  )
}
