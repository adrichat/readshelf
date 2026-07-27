"use client"

import { useEffect } from "react"
import Link from "next/link"
import { BookOpen, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4 text-center">
      <div className="flex items-center gap-2 mb-8 text-gray-400">
        <BookOpen className="w-5 h-5 text-amber-400" />
        <span className="font-semibold">ReadShelf</span>
      </div>
      <p className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-3">Erreur</p>
      <h1 className="text-2xl font-bold mb-2">Un problème est survenu</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        Réessaie — si ça persiste, reviens un peu plus tard.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={unstable_retry} className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Réessayer
        </Button>
        <Link href="/">
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
            Accueil
          </Button>
        </Link>
      </div>
    </div>
  )
}
