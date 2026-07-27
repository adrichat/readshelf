"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    if (!email.trim()) return
    setLoading(true)
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    })
    setLoading(false)
    // Toujours le même message, que le compte existe ou non
    setSent(true)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold">Mot de passe oublié</h1>
        </div>

        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-400">
              Si un compte existe avec l&apos;adresse <span className="text-white">{email}</span>, un email
              vient d&apos;être envoyé avec un lien pour choisir un nouveau mot de passe.
            </p>
            <Link href="/login" className="text-sm text-amber-400 hover:text-amber-300">
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 -mt-2 mb-2">
              Indique ton adresse email, on t&apos;envoie un lien pour le réinitialiser.
            </p>
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Adresse email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="toi@exemple.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                autoFocus
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || !email.trim()}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? "Envoi…" : "Envoyer le lien"}
            </Button>
            <Link href="/login" className="text-xs text-gray-600 hover:text-gray-400">
              ← Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
