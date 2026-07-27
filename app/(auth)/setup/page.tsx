"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { BookOpen, AtSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SetupPage() {
  const { update } = useSession()
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!username.trim() || username.length < 3) {
      setError("Le nom d'utilisateur doit faire au moins 3 caractères.")
      return
    }
    if (!/^[a-z0-9_-]+$/.test(username)) {
      setError("Uniquement des lettres minuscules, chiffres, - et _")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Vérifie disponibilité
      const checkRes = await fetch(`/api/username/check?username=${username}`)
      if (!checkRes.ok) throw new Error(`check failed: ${checkRes.status}`)
      const { available } = await checkRes.json()
      if (!available) {
        setError("Ce nom d'utilisateur est déjà pris.")
        return
      }

      // Sauvegarde le username
      const res = await fetch("/api/auth/set-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Erreur serveur (${res.status})`)
        return
      }

      // Rafraîchit le JWT avec le nouveau username avant de rediriger
      await update({ username })
      window.location.href = "/dashboard"
    } catch (err) {
      setError(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-violet-400" />
          <h1 className="text-xl font-bold">Choisis ton URL</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          C'est l'adresse de ta bibliothèque publique. Tu ne pourras pas la changer.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="text-gray-400 text-xs mb-2 block">Nom d'utilisateur</Label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3">
              <AtSign className="w-4 h-4 text-gray-500 shrink-0" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="ton-nom"
                className="border-0 bg-transparent text-white placeholder:text-gray-600 focus-visible:ring-0"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              readshelf.dev/<span className="text-violet-400">{username || "ton-nom"}</span>
            </p>
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            {loading ? "Vérification…" : "Créer ma bibliothèque"}
          </Button>
        </div>
      </div>
    </div>
  )
}
