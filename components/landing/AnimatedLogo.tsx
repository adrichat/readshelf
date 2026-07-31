"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

// Adapté du prototype d'animation du logo (Réveil → Titre → Respiration).
// La scène "Respiration" ne joue plus une seule fois : elle boucle à l'infini
// une fois l'intro terminée, pour que le logo continue de "respirer" en fond.
// Dégradé fixe — mêmes couleurs (amber-300 → orange-500) que "Link-in-Bio" dans le H1,
// sans animation de position pour rester des couleurs brutes, non changeantes.
const GRADIENT = "linear-gradient(to right, #fcd34d, #f97316)"

const REVEAL_DURATION = 1.6
const TITLE_DURATION = 1.6
const BREATH_DURATION = 2.8

export function AnimatedLogo({
  className,
  showTagline = false,
}: {
  className?: string
  showTagline?: boolean
}) {
  const reduce = useReducedMotion()

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Mark — révélation circulaire + pop, puis respiration infinie */}
      <motion.div
        className="relative"
        style={{ width: "clamp(64px, 9vw, 112px)", aspectRatio: "100 / 72.33" }}
        initial={reduce ? false : { y: 0, scale: 1 }}
        animate={{ y: [0, -4, 0, 4, 0], scale: [1, 1.008, 1, 0.992, 1] }}
        transition={{
          duration: BREATH_DURATION,
          repeat: reduce ? 0 : Infinity,
          ease: "easeInOut",
          delay: REVEAL_DURATION + TITLE_DURATION,
        }}
      >
        <motion.div
          aria-hidden
          className="absolute -inset-6 rounded-full blur-2xl"
          style={{ background: "radial-gradient(closest-side,#f97316,transparent 70%)" }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: REVEAL_DURATION * 0.25, delay: REVEAL_DURATION * 0.1 }}
        />
        <motion.div
          aria-hidden
          className="relative w-full h-full"
          style={{
            backgroundImage: GRADIENT,
            WebkitMaskImage: "url(/logo.svg)",
            maskImage: "url(/logo.svg)",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
          initial={reduce ? false : { opacity: 0, scale: 0.9, clipPath: "circle(0% at 50% 50%)" }}
          animate={{ opacity: 1, scale: 1, clipPath: "circle(85% at 50% 50%)" }}
          transition={{
            opacity: { duration: REVEAL_DURATION * 0.2 },
            clipPath: { duration: REVEAL_DURATION * 0.75, ease: "easeOut" },
            scale: { duration: REVEAL_DURATION * 0.75, delay: REVEAL_DURATION * 0.05, ease: "backOut" },
          }}
        />
      </motion.div>

      {/* Titre — apparaît une fois le mark révélé */}
      <motion.div
        className="mt-3 md:mt-4 text-4xl md:text-6xl leading-none"
        style={{
          fontFamily: "var(--font-caprasimo)",
          backgroundImage: GRADIENT,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: TITLE_DURATION * 0.42,
          delay: REVEAL_DURATION + TITLE_DURATION * 0.18,
          ease: "easeOut",
        }}
      >
        Readshelf
      </motion.div>

      {showTagline && (
        <motion.p
          className="mt-2 text-lg md:text-xl font-medium text-amber-100/70"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: TITLE_DURATION * 0.44,
            delay: REVEAL_DURATION + TITLE_DURATION * 0.42,
            ease: "easeOut",
          }}
        >
          Le Link-in-Bio qui met ta bibliothèque en vitrine
        </motion.p>
      )}
    </div>
  )
}
