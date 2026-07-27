import Link from "next/link"
import { BookOpen } from "lucide-react"

interface Props {
  title: string
  updatedAt: string
  children: React.ReactNode
}

export function LegalPage({ title, updatedAt, children }: Props) {
  return (
    <div className="min-h-screen bg-[#101016] text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
          <BookOpen className="w-5 h-5 text-violet-400" />
          <span className="font-semibold tracking-tight">ReadShelf</span>
        </Link>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <Link href="/mentions-legales" className="hover:text-gray-300 transition-colors">Mentions légales</Link>
          <Link href="/cgu-cgv" className="hover:text-gray-300 transition-colors">CGU/CGV</Link>
          <Link href="/confidentialite" className="hover:text-gray-300 transition-colors">Confidentialité</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-xs text-gray-500 mb-10">Dernière mise à jour : {updatedAt}</p>
        <div className="legal-content flex flex-col gap-6 text-sm text-gray-300 leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="border-t border-white/5 px-6 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} ReadShelf — Adrien Guillemot (EI)
      </footer>
    </div>
  )
}
