"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpen, Star, Palette, Globe, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const DEMO_BOOKS = [
  { title: "Dune", color: "#c2500a" },
  { title: "Akira", color: "#1a1a2e" },
  { title: "Watchmen", color: "#1e3a5f" },
  { title: "Fondation", color: "#2d4a22" },
  { title: "Berserk", color: "#3a1a1a" },
  { title: "Le Seigneur des Anneaux", color: "#2a2a1a" },
]

export function LandingContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="min-h-screen bg-[#101016] text-white flex flex-col">
      {/* Halo ambiant — couleur douce qui dérive lentement dans le spectre */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <style>{`
          @keyframes lp-hue {
            from { filter: hue-rotate(0deg); }
            to { filter: hue-rotate(360deg); }
          }
          @keyframes lp-glow1 {
            0%, 100% { transform: translate(-15%, -20%) scale(1); opacity: 0.8; }
            50% { transform: translate(10%, 12%) scale(1.3); opacity: 1; }
          }
          @keyframes lp-glow2 {
            0%, 100% { transform: translate(20%, 30%) scale(1.2); opacity: 0.9; }
            50% { transform: translate(-12%, -10%) scale(0.9); opacity: 0.6; }
          }
        `}</style>
        <div className="absolute inset-0" style={{ animation: "lp-hue 45s linear infinite" }}>
          <div
            className="absolute w-[70vw] h-[70vw] rounded-full blur-3xl"
            style={{
              top: "-5%",
              left: "10%",
              backgroundColor: "rgba(139,92,246,0.28)",
              animation: "lp-glow1 18s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-[55vw] h-[55vw] rounded-full blur-3xl"
            style={{
              bottom: "0%",
              right: "5%",
              backgroundColor: "rgba(139,92,246,0.2)",
              animation: "lp-glow2 24s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-400" />
          <span className="font-semibold tracking-tight">ReadShelf</span>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  Connexion
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                  Commencer
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-6 bg-violet-500/10 text-violet-300 border-violet-500/20">
            ✦ Ta bibliothèque, ton identité
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Ta bibliothèque mérite
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-purple-500">
              sa vitrine
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-xl mx-auto mb-10">
            Romans, BD, mangas — rassemble tes lectures sur une page à ton image
            et partage-la en un seul lien.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/dashboard" : "/register"}>
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-8">
                {isLoggedIn ? "Mon dashboard" : "Créer ma page"}
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-white/10 text-gray-300 hover:bg-white/5 px-8">
                Voir un exemple
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Demo shelf */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 flex gap-3 items-end"
        >
          {DEMO_BOOKS.map((book, i) => (
            <motion.div
              key={book.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="relative group cursor-pointer"
            >
              <div
                className="w-16 rounded-sm shadow-2xl transition-transform duration-200 group-hover:-translate-y-2"
                style={{
                  height: `${100 + Math.sin(i) * 20}px`,
                  backgroundColor: book.color,
                  boxShadow: `4px 4px 20px ${book.color}40`,
                }}
              />
              <div className="absolute inset-y-0 left-0 w-1 bg-black/20 rounded-l-sm" />
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-4 text-xs text-gray-500">readshelf.app/ton-nom</p>
      </section>

      {/* Features */}
      <section className="relative border-t border-white/5 px-6 py-20">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: BookOpen, title: "Bibliothèque dynamique", desc: "Ajoute livres, BD et mangas. Les couvertures sont récupérées automatiquement via Open Library." },
            { icon: Palette, title: "Entièrement personnalisable", desc: "Fond, couleurs, polices, effets — ta page reflète ton univers de lecteur." },
            { icon: Globe, title: "URL unique", desc: "Une adresse à ton nom : readshelf.app/toi. Partage-la partout." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative border-t border-white/5 px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Simple et transparent</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <h3 className="text-xl font-bold mb-1">Gratuit</h3>
              <div className="text-4xl font-bold mb-1">0€</div>
              <p className="text-sm text-gray-500 mb-6">/À vie</p>
              <ul className="space-y-3 text-sm text-gray-400">
                {["Profil public avec URL unique", "Bibliothèque illimitée", "Couvertures automatiques", "Rayons personnalisés", "Thèmes basiques"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-violet-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={isLoggedIn ? "/dashboard" : "/register"} className="block mt-8">
                <Button className="w-full" variant="outline">Commencer</Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8 relative">
              <Badge className="absolute top-4 right-4 bg-violet-500 text-white text-xs">Le plus populaire</Badge>
              <h3 className="text-xl font-bold mb-1">✦ Premium</h3>
              <div className="text-4xl font-bold mb-1">4,99€</div>
              <p className="text-sm text-violet-400 mb-6">Paiement unique. Tu le gardes pour toujours.</p>
              <ul className="space-y-3 text-sm text-gray-300">
                {["Badge Lecteur Premium", "Layouts avancés (étagère, mosaïque)", "Polices personnalisées", "Effets spéciaux (particules, lueur)", "Personnalisation avancée", "SEO et métadonnées custom"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-violet-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/premium" className="block mt-8">
                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">Acheter</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/5 px-6 py-6 text-center text-xs text-gray-500">
        © 2025 ReadShelf
      </footer>
    </div>
  )
}
