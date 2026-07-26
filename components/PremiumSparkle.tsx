"use client"

import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"

export function PremiumSparkle({ className = "" }: { className?: string }) {
  const router = useRouter()

  return (
    <button
      type="button"
      title="Lecteur Premium"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        router.push("/dashboard/premium")
      }}
      className={`shrink-0 cursor-pointer hover:opacity-75 transition-opacity ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
    </button>
  )
}
