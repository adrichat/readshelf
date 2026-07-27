"use client"

import { useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, BookOpen, Sparkles } from "lucide-react"
import { NAV_ITEMS } from "./nav-items"
import { AchievementsBadge } from "./AchievementsBadge"
import { ThemeToggle } from "./ThemeToggle"

interface Props {
  isPremium: boolean
  /** Formulaire de déconnexion (server action) rendu par le layout */
  signOutSlot: React.ReactNode
}

// true uniquement après montage : le portal ne peut pas exister côté serveur
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function MobileNav({ isPremium, signOutSlot }: Props) {
  const [open, setOpen] = useState(false)
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Portal : le backdrop-blur du header créerait sinon un containing
          block et le panneau fixed serait clippé dedans */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div key="drawer" className="fixed inset-0 z-50 md:hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#0d0d12] border-r border-gray-200 dark:border-white/10 flex flex-col p-4 overflow-y-auto"
                >
                  <div className="flex items-center justify-between px-2 mb-6">
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="font-semibold text-sm">ReadShelf</span>
                    </span>
                    <button
                      onClick={() => setOpen(false)}
                      aria-label="Fermer le menu"
                      className="p-2 -mr-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <nav className="flex flex-col gap-1 flex-1">
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                        {href === "/dashboard/achievements" && <AchievementsBadge />}
                      </Link>
                    ))}
                  </nav>

                  {!isPremium && (
                    <Link
                      href="/dashboard/premium"
                      onClick={() => setOpen(false)}
                      className="mb-3 block p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        Compte gratuit
                      </span>
                      <span className="block text-xs text-gray-500 leading-relaxed">
                        Débloque layouts, polices et effets — 4,99 € à vie.
                      </span>
                    </Link>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/5 pt-4 pb-3 px-1">
                    <span className="text-xs text-gray-500">Apparence</span>
                    <ThemeToggle />
                  </div>
                  {signOutSlot}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
