import Link from "next/link"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"

export default function NotFound() {
  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4 text-center">
      <div className="flex items-center gap-2 mb-8 text-gray-400">
        <Logo className="w-[50px] h-[50px] text-amber-400" />
        <span className="font-semibold">ReadShelf</span>
      </div>
      <p className="text-sm font-semibold text-amber-400 uppercase tracking-widest mb-3">Erreur 404</p>
      <h1 className="text-2xl font-bold mb-2">Cette page n&apos;existe pas</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        Le lien est peut-être cassé, ou la page a été déplacée.
      </p>
      <Link href="/">
        <Button className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
          <Home className="w-4 h-4" />
          Retour à l&apos;accueil
        </Button>
      </Link>
    </div>
  )
}
