"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { Logo } from "@/components/Logo"
import { readableTextOn } from "@/lib/profile-colors"

// Laisse la page se poser avant de glisser la notif : elle est perçue comme une
// invitation, pas comme un interstitiel qui bloque l'arrivée sur le profil.
const APPEAR_DELAY_MS = 1200

// Notif de bas de page invitant le visiteur à créer sa propre page ReadShelf.
// Reprend la couleur d'accent du profil visité pour rester dans son thème.
export function PromoPopup({ accentColor }: { accentColor: string }) {
  const [visible, setVisible] = useState(false)
  const reduceMotion = useReducedMotion()
  const textColor = readableTextOn(accentColor)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    // Centrée en bas sur mobile, calée à droite sur grand écran. Le conteneur
    // couvre toute la largeur mais laisse passer les clics : seule la carte
    // elle-même est cliquable. z-40 : la notif passe sous la visionneuse de
    // couverture (z-50), qui doit rester seule à l'écran une fois ouverte.
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center sm:justify-end px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 72 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              ...(reduceMotion ? {} : { y: 24, scale: 0.96 }),
              transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
            }}
            // Courbe très amortie (pas de rebond) : la carte décélère en
            // arrivant, ce qui donne la sortie « depuis le bas » sans effet ressort.
            transition={{ duration: reduceMotion ? 0.2 : 0.62, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative w-full max-w-sm sm:w-[21rem] rounded-2xl overflow-hidden"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 10px 40px -8px ${accentColor}80, 0 2px 8px rgba(0,0,0,0.25)`,
            }}
          >
            {/* Le bouton de fermeture est un frère du lien, pas un enfant :
                un <button> dans un <a> est une imbrication invalide. */}
            <Link href="/" className="flex items-center gap-3 py-4 pl-4 pr-10">
              <span
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${textColor}1f`, color: textColor }}
              >
                <Logo className="w-6 h-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight" style={{ color: textColor }}>
                  Tes lectures et liens sociaux dans une seule page
                </span>
                <span className="block text-xs leading-snug mt-0.5" style={{ color: `${textColor}c4` }}>
                  Crée ton lien ReadShelf gratuitement maintenant !
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Fermer"
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-opacity opacity-60 hover:opacity-100"
              style={{ color: textColor, backgroundColor: `${textColor}1a` }}
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
