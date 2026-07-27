"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PremiumBuyButton() {
  const [accepted, setAccepted] = useState(false)
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
    <div className="flex flex-col gap-3">
      <label className="flex items-start gap-2.5 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 accent-violet-600"
        />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgu-cgv" target="_blank" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            CGV
          </Link>{" "}
          et je demande l&apos;exécution immédiate du service Premium, ce qui implique de renoncer à mon droit de
          rétractation de 14 jours dès son activation.
        </span>
      </label>
      <Button
        onClick={buy}
        disabled={loading || !accepted}
        className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-5 text-base disabled:opacity-40"
      >
        {loading ? "Redirection…" : "Passer Premium — 4,99 €"}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
