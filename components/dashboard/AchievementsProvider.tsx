"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import type { AchievementDef } from "@/lib/achievements"
import { ACHIEVEMENTS_CHECK_EVENT } from "@/lib/achievements-events"

const BadgeContext = createContext(0)
export const useAchievementsUnseenCount = () => useContext(BadgeContext)

interface Toast extends AchievementDef {
  key: string
}

interface CheckResponse {
  justUnlocked: AchievementDef[]
  unseenCount: number
}

const DISPLAY_MS = 6000

// Le layout du dashboard ne se ré-exécute pas côté serveur à chaque navigation
// interne (segments partagés par Next.js), donc on ne peut pas compter dessus
// pour détecter les déblocages en temps réel. Ce provider interroge plutôt
// /api/achievements/check : au montage, à chaque changement de route, et sur
// un event custom déclenché juste après une action susceptible de débloquer
// un succès (ex: ajout de livre) — sans attendre une navigation.
export function AchievementsProvider({
  initialUnseenCount,
  children,
}: {
  initialUnseenCount: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [unseenCount, setUnseenCount] = useState(initialUnseenCount)
  const [toasts, setToasts] = useState<Toast[]>([])

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/achievements/check")
      if (!res.ok) return
      const data: CheckResponse = await res.json()
      setUnseenCount(data.unseenCount)
      if (data.justUnlocked.length > 0) {
        setToasts((prev) => [
          ...prev,
          ...data.justUnlocked.map((a) => ({ ...a, key: `${a.id}-${Date.now()}` })),
        ])
      }
    } catch {
      // Silencieux — un check raté n'est pas grave, le prochain (navigation
      // suivante ou event) rattrapera l'état.
    }
  }, [])

  useEffect(() => {
    // check() only touches state after its internal `await fetch(...)`
    // resolves (an async continuation, not a synchronous call) — the linter
    // can't see through that indirection from here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check()
  }, [pathname, check])

  useEffect(() => {
    window.addEventListener(ACHIEVEMENTS_CHECK_EVENT, check)
    return () => window.removeEventListener(ACHIEVEMENTS_CHECK_EVENT, check)
  }, [check])

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((prev) => prev.filter((p) => p.key !== t.key)), DISPLAY_MS)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts])

  const dismiss = (key: string) => setToasts((prev) => prev.filter((p) => p.key !== key))

  return (
    <BadgeContext.Provider value={unseenCount}>
      {children}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.key}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={() => dismiss(t.key)}
              className="pointer-events-auto relative w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-amber-500/30 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md shadow-lg shadow-black/10 dark:shadow-black/40 p-4 flex gap-3 cursor-pointer"
            >
              <div className="w-11 h-11 shrink-0 rounded-full bg-amber-500/15 flex items-center justify-center text-xl">
                {t.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-0.5">
                  Succès débloqué
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                <p className="text-xs text-gray-500 truncate">{t.description}</p>
              </div>
              <motion.div
                key={`${t.key}-bar`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: DISPLAY_MS / 1000, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-amber-400/70"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </BadgeContext.Provider>
  )
}
