// Libellés et couleurs des statuts de lecture — dans lib/ (et non dans
// BookCard) pour que l'aperçu plein écran puisse les réutiliser sans créer
// de cycle d'import BookCard → Hover3D → CoverViewer → BookCard.

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  READING:   { label: "En cours",   color: "#60a5fa" },
  READ:      { label: "Lu",         color: "#4ade80" },
  TO_READ:   { label: "À lire",     color: "#9ca3af" },
  ABANDONED: { label: "Abandonné",  color: "#f87171" },
}

// Variantes plus soutenues, lisibles sur fond de profil clair
export const STATUS_COLORS_ON_LIGHT: Record<string, string> = {
  READING:   "#1d4ed8",
  READ:      "#15803d",
  TO_READ:   "#475569",
  ABANDONED: "#b91c1c",
}
