"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function PremiumBuyButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function buy() {
    setLoading(true)
    setError("")
    const res = await fetch("/api/stripe/checkout", { method: "POST" })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setError("Impossible de lancer le paiement. Réessaie.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={buy}
        disabled={loading}
        className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-5 text-base"
      >
        {loading ? "Redirection…" : "Passer Premium — 4,99 €"}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
