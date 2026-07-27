"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

export function CopyLinkButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    // L'URL réelle du profil, valable en dev comme en prod
    const url = `${window.location.origin}/${username}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Contexte non sécurisé ou permission refusée : fallback legacy
      const ta = document.createElement("textarea")
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      title="Copier le lien de mon profil"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
        copied
          ? "border-green-500/40 bg-green-500/10 text-green-300"
          : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/25"
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copié !" : "Copier le lien"}
    </button>
  )
}
