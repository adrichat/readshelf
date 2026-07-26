"use client"

import { useMemo } from "react"

interface ProfileEffectsProps {
  effect: "PARTICLES" | "AMBIENT_GLOW" | "NOISE"
  accentColor: string
  // Tiré au hasard côté serveur à chaque visite ; en le recevant en prop,
  // le rendu serveur et l'hydratation client produisent les mêmes particules
  seed?: number
}

// PRNG mulberry32 — aléatoire reproductible à partir du seed
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function ProfileEffects({ effect, accentColor, seed = 1 }: ProfileEffectsProps) {
  const particles = useMemo(() => {
    const rand = mulberry32(seed)
    const count = 32 + Math.floor(rand() * 17)
    return Array.from({ length: count }, () => {
      const duration = 8 + rand() * 16
      return {
        left: rand() * 100,
        size: 2 + rand() * 4,
        duration,
        // Délai négatif aléatoire : chaque particule démarre à un point
        // quelconque de sa trajectoire au lieu de toutes partir du bas
        delay: -rand() * duration,
        opacity: 0.3 + rand() * 0.55,
        drift: (rand() < 0.5 ? -1 : 1) * (10 + rand() * 70),
        twinkleDuration: 2 + rand() * 4,
        twinkleDelay: -rand() * 6,
      }
    })
  }, [seed])

  if (effect === "PARTICLES") {
    return (
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
        <style>{`
          @keyframes rs-float {
            0% { transform: translate(0, 105vh); }
            100% { transform: translate(var(--rs-drift), -8vh); }
          }
          @keyframes rs-twinkle {
            0%, 100% { opacity: var(--rs-opacity); }
            50% { opacity: calc(var(--rs-opacity) * 0.35); }
          }
        `}</style>
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                backgroundColor: accentColor,
                boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${accentColor}55`,
                "--rs-opacity": p.opacity,
                "--rs-drift": `${p.drift}px`,
                animation: `rs-float ${p.duration}s linear infinite, rs-twinkle ${p.twinkleDuration}s ease-in-out infinite`,
                animationDelay: `${p.delay}s, ${p.twinkleDelay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    )
  }

  if (effect === "AMBIENT_GLOW") {
    return (
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
        <style>{`
          @keyframes rs-glow {
            0%, 100% { transform: translate(-20%, -30%) scale(1); opacity: 0.85; }
            50% { transform: translate(15%, 10%) scale(1.3); opacity: 1; }
          }
          @keyframes rs-glow2 {
            0%, 100% { transform: translate(30%, 40%) scale(1.25); opacity: 0.9; }
            50% { transform: translate(-10%, -15%) scale(0.9); opacity: 0.6; }
          }
          @keyframes rs-glow3 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
            50% { transform: translate(-25%, 20%) scale(1.4); opacity: 0.95; }
          }
        `}</style>
        <div
          className="absolute w-[70vw] h-[70vw] rounded-full blur-3xl"
          style={{
            top: "5%",
            left: "15%",
            backgroundColor: `${accentColor}40`,
            animation: "rs-glow 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[55vw] h-[55vw] rounded-full blur-3xl"
          style={{
            bottom: "0%",
            right: "5%",
            backgroundColor: `${accentColor}35`,
            animation: "rs-glow2 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[40vw] h-[40vw] rounded-full blur-3xl"
          style={{
            top: "40%",
            left: "45%",
            backgroundColor: `${accentColor}2a`,
            animation: "rs-glow3 22s ease-in-out infinite",
          }}
        />
      </div>
    )
  }

  // NOISE — texture grain SVG statique
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden
      style={{
        opacity: 0.14,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  )
}
