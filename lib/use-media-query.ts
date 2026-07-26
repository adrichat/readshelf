"use client"

import { useSyncExternalStore } from "react"

/**
 * Suit une media query sans setState dans un effet (compatible SSR :
 * `serverDefault` est utilisé côté serveur, corrigé à l'hydratation).
 */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverDefault
  )
}
