import { Award, BookOpen, Library, Palette, Settings, Sparkles, Trophy } from "lucide-react"

// Navigation du dashboard — partagée entre la sidebar desktop (layout serveur)
// et le drawer mobile (client)
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: BookOpen },
  { href: "/dashboard/library", label: "Ma bibliothèque", icon: Library },
  { href: "/dashboard/achievements", label: "Succès", icon: Award },
  { href: "/dashboard/appearance", label: "Apparence", icon: Palette },
  { href: "/dashboard/ranking", label: "Classement", icon: Trophy },
  { href: "/dashboard/premium", label: "Premium", icon: Sparkles },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
]
