"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readThemeFromDocument(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Le SSR n'a pas accès à localStorage : le state démarre donc sur "dark"
  // des deux côtés (identique au rendu serveur) pour éviter un mismatch
  // d'hydratation, puis se resynchronise juste après montage avec la classe
  // déjà posée sur <html> par le script inline (beforeInteractive, voir
  // layout.tsx) — qui, elle, ne provoque aucun flash visuel puisqu'elle est
  // appliquée avant la peinture.
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resynchronisation post-hydratation nécessaire, pas de cascade (ne dépend d'aucun state)
    setThemeState(readThemeFromDocument())
  }, [])

  function setTheme(next: Theme) {
    setThemeState(next)
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(next)
    localStorage.setItem("theme", next)
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
