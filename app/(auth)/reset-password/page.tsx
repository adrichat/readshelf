"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError("")
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      if (data.error === "EXPIRED_TOKEN") {
        setError("Ce lien a expiré. Redemande-en un nouveau.")
      } else if (data.error === "INVALID_TOKEN") {
        setError("Ce lien est invalide. Redemande-en un nouveau.")
      } else {
        setError(data.message ?? "Une erreur est survenue.")
      }
      return
    }

    router.push("/login?reset=1")
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Lien invalide</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Ce lien de réinitialisation est incomplet ou invalide.
          </p>
          <Link href="/forgot-password" className="text-sm text-amber-400 hover:text-amber-300">
            ← Redemander un lien
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-white">Nouveau mot de passe</h1>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="text-gray-400 text-xs mb-2 block">Nouveau mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-2 block">Confirme le mot de passe</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="8 caractères minimum"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400">
              {error}{" "}
              {(error.includes("expiré") || error.includes("invalide")) && (
                <Link href="/forgot-password" className="text-amber-400 hover:text-amber-300 underline">
                  Redemander un lien
                </Link>
              )}
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? "Enregistrement…" : "Réinitialiser mon mot de passe"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
