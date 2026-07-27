"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { BookOpen, AtSign, Mail, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Step = "username" | "method" | "email-form" | "sent"
type UsernameCheck = "idle" | "checking" | "available" | "taken"

function RegisterForm() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>("username")
  const [username, setUsername] = useState(
    () => searchParams.get("username")?.toLowerCase().replace(/[^a-z0-9_-]/g, "") ?? ""
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>("idle")
  const latestUsername = useRef("")

  useEffect(() => {
    latestUsername.current = username
    setError("")
    if (username.length < 3 || !/^[a-z0-9_-]+$/.test(username)) {
      setUsernameCheck("idle")
      return
    }
    setUsernameCheck("checking")
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/username/check?username=${username}`)
      const data = await res.json()
      if (latestUsername.current === username) {
        setUsernameCheck(data.available ? "available" : "taken")
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [username])

  async function checkUsername() {
    if (!username.trim() || username.length < 3) {
      setError("Le nom d'utilisateur doit faire au moins 3 caractères.")
      return
    }
    if (!/^[a-z0-9_-]+$/.test(username)) {
      setError("Uniquement des lettres minuscules, chiffres, - et _")
      return
    }

    if (usernameCheck !== "available") {
      setLoading(true)
      setError("")
      const res = await fetch(`/api/username/check?username=${username}`)
      const data = await res.json()
      setLoading(false)

      if (!data.available) {
        setUsernameCheck("taken")
        setError("Ce nom d'utilisateur est déjà pris.")
        return
      }
      setUsernameCheck("available")
    }

    sessionStorage.setItem("pending_username", username)
    setStep("method")
  }

  async function registerWithEmail() {
    setError("")
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Adresse email invalide.")
      return
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Une erreur est survenue.")
      return
    }

    setStep("sent")
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-violet-400" />
          <h1 className="text-xl font-bold">
            {step === "username" && "Crée ton compte"}
            {step === "method" && "Choisis comment te connecter"}
            {step === "email-form" && "Crée ton mot de passe"}
            {step === "sent" && "Vérifie ta boîte mail"}
          </h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          {step === "username" && "Crée ton profil de lecteur et partage ta bibliothèque."}
          {step === "method" && `Ton URL sera readshelf.dev/${username}`}
          {step === "email-form" && `On enverra un email de confirmation à ${email || "ton adresse"}.`}
          {step === "sent" && `Un email de confirmation a été envoyé à ${email}. Clique sur le lien pour activer ton compte.`}
        </p>

        {step === "username" && (
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Nom d&apos;utilisateur</Label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3">
                <AtSign className="w-4 h-4 text-gray-500 shrink-0" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  onKeyDown={(e) => e.key === "Enter" && checkUsername()}
                  placeholder="ton-nom"
                  className="border-0 bg-transparent text-white placeholder:text-gray-600 focus-visible:ring-0"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">readshelf.dev/{username || "ton-nom"}</p>
              {!error && usernameCheck === "checking" && (
                <p className="text-xs text-gray-500 mt-2">Vérification…</p>
              )}
              {!error && usernameCheck === "available" && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Nom d&apos;utilisateur disponible
                </p>
              )}
              {!error && usernameCheck === "taken" && (
                <p className="text-xs text-red-400 mt-2">Ce nom d&apos;utilisateur est déjà pris.</p>
              )}
              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>
            <Button
              onClick={checkUsername}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              {loading ? "Vérification…" : "Continuer"}
            </Button>
          </div>
        )}

        {step === "method" && (
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => signIn("google", { callbackUrl: `/api/auth/setup?username=${username}` })}
              variant="outline"
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuer avec Google
            </Button>
            <Button
              onClick={() => signIn("discord", { callbackUrl: `/api/auth/setup?username=${username}` })}
              variant="outline"
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-3"
            >
              <svg className="w-4 h-4 fill-[#5865F2]" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.133 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Continuer avec Discord
            </Button>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-gray-600">ou</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <Button
              onClick={() => setStep("email-form")}
              variant="outline"
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-3"
            >
              <Mail className="w-4 h-4" />
              Continuer avec un email
            </Button>

            <button
              onClick={() => setStep("username")}
              className="text-xs text-gray-600 hover:text-gray-400 mt-2"
            >
              ← Changer de nom d&apos;utilisateur
            </button>
          </div>
        )}

        {step === "email-form" && (
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Adresse email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Mot de passe</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Confirme le mot de passe</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && registerWithEmail()}
                placeholder="8 caractères minimum"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button
              onClick={registerWithEmail}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              {loading ? "Création…" : "Créer mon compte"}
            </Button>
            <button
              onClick={() => setStep("method")}
              className="text-xs text-gray-600 hover:text-gray-400"
            >
              ← Retour
            </button>
          </div>
        )}

        {step === "sent" && (
          <div className="flex flex-col gap-4 items-center text-center">
            <Mail className="w-10 h-10 text-violet-400" />
            <Link href="/login" className="text-sm text-violet-400 hover:text-violet-300">
              Retour à la connexion
            </Link>
          </div>
        )}

        {step !== "sent" && (
          <>
            <p className="mt-6 text-center text-sm text-gray-600">
              Tu as déjà un compte ?{" "}
              <Link href="/login" className="text-violet-400 hover:text-violet-300">
                Se connecter
              </Link>
            </p>
            <p className="mt-3 text-center text-xs text-gray-600">
              En créant un compte, tu acceptes les{" "}
              <Link href="/cgu-cgv" className="text-gray-400 hover:text-gray-300 underline underline-offset-2">
                CGU/CGV
              </Link>{" "}
              et la{" "}
              <Link href="/confidentialite" className="text-gray-400 hover:text-gray-300 underline underline-offset-2">
                politique de confidentialité
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}
