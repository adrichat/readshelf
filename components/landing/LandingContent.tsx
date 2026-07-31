"use client"

import { useState, type CSSProperties, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpen, Star, Palette, Globe, LayoutDashboard, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/Logo"
import { AnimatedLogo } from "@/components/landing/AnimatedLogo"
import { SocialIcon, CustomLinkIcon } from "@/components/profile/SocialIcon"
import type { SocialKey } from "@/lib/social-links"

// Fixe le thème ambre pour toute la page d'accueil (indépendant du mode clair/sombre du dashboard)
const THEME_OVERRIDE = {
  "--primary": "#d97706",
  "--primary-foreground": "#ffffff",
  "--accent": "#d97706",
  "--accent-foreground": "#ffffff",
  "--ring": "#f59e0b",
} as CSSProperties

const SOCIAL_LINKS: { key: SocialKey; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "spotify", label: "Spotify" },
  { key: "goodreads", label: "Goodreads" },
]

const DEMO_BOOKS = [
  { title: "Dune", color: "#c2500a" },
  { title: "Akira", color: "#1a1a2e" },
  { title: "Watchmen", color: "#1e3a5f" },
  { title: "Fondation", color: "#2d4a22" },
  { title: "Berserk", color: "#3a1a1a" },
]

const FEATURES = [
  {
    icon: BookOpen,
    title: "Bibliothèque dynamique",
    desc: "Ajoute livres, BD et mangas. Les couvertures sont récupérées automatiquement.",
  },
  {
    icon: Palette,
    title: "Entièrement personnalisable",
    desc: "Fond, couleurs, polices, effets — ta page reflète ton univers de lecteur.",
  },
  {
    icon: Globe,
    title: "URL unique",
    desc: "Une adresse mémorable — readshelf.dev/toi — à partager en un clic.",
  },
  {
    icon: Sparkles,
    title: "Effets premium",
    desc: "Particules, lueurs, layouts avancés — débloque des rendus uniques pour ta vitrine.",
  },
]

function ProfilePreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: -2, transition: { duration: 0.8, delay: 0.35 } }}
      whileHover={{ rotate: 0, scale: 1.04, y: -6, transition: { duration: 0.15, delay: 0 } }}
      className="group relative w-full max-w-sm rounded-2xl border border-amber-500/20 bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-amber-900/20 overflow-hidden transition-shadow duration-150 hover:border-amber-400/40 hover:shadow-amber-500/30"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-black/20 relative z-10">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
          <span className="w-2 h-2 rounded-full bg-white/10" />
        </div>
        <span className="ml-2 text-[11px] text-gray-500 font-mono">readshelf.dev/jim</span>
      </div>

      {/* Fond animé (exemple de personnalisation avec une image/gif) */}
      <div className="absolute inset-0 top-9 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-110"
          style={{
            backgroundImage: "url(/demo/profile-bg.gif)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative px-6 pt-7 pb-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full mb-3 overflow-hidden ring-2 ring-white/50 shadow-lg transition-transform duration-300 group-hover:scale-110">
          <img src="/demo/jim-halpert.png" alt="Jim Halpert" className="w-full h-full object-cover" />
        </div>
        <h3 className="font-semibold text-white drop-shadow">Jim Halpert</h3>
        <p className="text-xs text-gray-200 mb-2 drop-shadow">@jim</p>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-300/30 mb-4">
          ✦ Lecteur Premium
        </span>

        {/* Liens / médias (link in bio) */}
        <div className="flex items-center gap-2 mb-4">
          {SOCIAL_LINKS.slice(0, 3).map(({ key, label }) => (
            <span
              key={key}
              className="w-7 h-7 rounded-full bg-black/30 border border-white/20 flex items-center justify-center"
              title={label}
            >
              <SocialIcon social={key} className="w-3.5 h-3.5 text-white" />
            </span>
          ))}
        </div>

        <div className="flex items-center gap-5 mb-5">
          {[
            ["42", "livres"],
            ["8", "en cours"],
            ["10", "lus"],
            ["1.2k", "vues"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-lg font-bold text-white drop-shadow">{n}</div>
              <div className="text-[10px] text-gray-200 drop-shadow">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {DEMO_BOOKS.map((book) => (
            <div
              key={book.title}
              className="w-8 rounded-sm"
              style={{ height: 52, backgroundColor: book.color, boxShadow: `2px 2px 10px ${book.color}50` }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function LandingContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter()
  const [claimUsername, setClaimUsername] = useState("")

  function handleClaim(e: FormEvent) {
    e.preventDefault()
    const username = claimUsername.trim()
    router.push(username ? `/register?username=${encodeURIComponent(username)}` : "/register")
  }

  return (
    <div className="dark min-h-screen bg-[#101016] text-white flex flex-col" style={THEME_OVERRIDE}>
      {/* Halo ambiant — lueurs ambrées qui dérivent lentement */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <style>{`
          @keyframes lp-glow1 {
            0%, 100% { transform: translate(-15%, -20%) scale(1); opacity: 0.8; }
            50% { transform: translate(10%, 12%) scale(1.3); opacity: 1; }
          }
          @keyframes lp-glow2 {
            0%, 100% { transform: translate(20%, 30%) scale(1.2); opacity: 0.9; }
            50% { transform: translate(-12%, -10%) scale(0.9); opacity: 0.6; }
          }
        `}</style>
        <div
          className="absolute w-[70vw] h-[70vw] rounded-full blur-3xl"
          style={{
            top: "-5%",
            left: "10%",
            backgroundColor: "rgba(217,119,6,0.25)",
            animation: "lp-glow1 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[55vw] h-[55vw] rounded-full blur-3xl"
          style={{
            bottom: "0%",
            right: "5%",
            backgroundColor: "rgba(245,158,11,0.18)",
            animation: "lp-glow2 24s ease-in-out infinite",
          }}
        />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Logo className="w-[50px] h-[50px] text-amber-400" />
          <span className="font-semibold tracking-tight">ReadShelf</span>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
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
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
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
          <AnimatedLogo className="mb-8" />
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Le{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">
              Link-in-Bio
            </span>
            <br />
            qui met ta bibliothèque en vitrine
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-xl mx-auto mb-10">
            Tous tes livres réunis sur une page unique, prête à glisser dans ta bio
            TikTok, Instagram ou Discord.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/dashboard" : "/register"}>
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-8">
                {isLoggedIn ? "Mon dashboard" : "Créer ma page"}
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Link in bio */}
      <section className="relative px-6 py-20">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Badge className="mb-4 bg-amber-500/10 text-amber-300 border-amber-500/20">
              ✦ Tout, au même endroit
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Un seul lien pour{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">
                tout
              </span>{" "}
              partager
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Ta bibliothèque, ton Instagram, ta chaîne YouTube, ta playlist Spotify, ton Goodreads —
              tout regroupé sur une page unique, à glisser dans ta bio TikTok ou Discord.
            </p>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_LINKS.map(({ key, label }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-gray-300"
                >
                  <SocialIcon social={key} className="w-3.5 h-3.5 text-amber-400" />
                  {label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-gray-300">
                <CustomLinkIcon className="w-3.5 h-3.5 text-amber-400" />
                Lien perso
              </span>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <ProfilePreviewCard />
          </div>
        </div>
      </section>

      {/* Réservation de nom d'utilisateur */}
      {!isLoggedIn && (
        <section className="relative px-6 pb-20">
          <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Réserve ton nom avant qu&apos;on te le prenne.</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Choisis ton identifiant, on te dit tout de suite s&apos;il est libre.
            </p>
            <form onSubmit={handleClaim} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-1 bg-black/30 border border-white/10 rounded-lg px-4 h-12">
                <span className="text-gray-500 text-sm whitespace-nowrap">readshelf.dev/</span>
                <input
                  value={claimUsername}
                  onChange={(e) => setClaimUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="ton-nom"
                  className="flex-1 min-w-0 bg-transparent text-white placeholder:text-gray-600 outline-none text-sm"
                />
              </div>
              <Button type="submit" size="lg" className="bg-amber-600 hover:bg-amber-700 text-white h-12 px-8">
                Réserver maintenant
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="relative px-6 py-20">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-colors hover:border-amber-500/20 hover:bg-white/[0.04]"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative px-6 py-20">
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
                    <Star className="w-4 h-4 text-amber-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={isLoggedIn ? "/dashboard" : "/register"} className="block mt-8">
                <Button className="w-full" variant="outline">Commencer</Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 relative shadow-2xl shadow-amber-900/10">
              <Badge className="absolute top-4 right-4 bg-amber-500 text-white text-xs">Le plus populaire</Badge>
              <h3 className="text-xl font-bold mb-1">✦ Premium</h3>
              <div className="text-4xl font-bold mb-1">4,99€</div>
              <p className="text-sm text-amber-400 mb-6">Paiement unique. Tu le gardes pour toujours.</p>
              <ul className="space-y-3 text-sm text-gray-300">
                {["Badge Lecteur Premium", "Layouts avancés (étagère, mosaïque)", "Polices personnalisées", "Effets spéciaux (particules, lueur)", "Personnalisation avancée", "SEO et métadonnées custom"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/premium" className="block mt-8">
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">Acheter</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative px-6 py-16">
        <div className="max-w-3xl mx-auto rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-600/5 px-8 py-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Prêt à donner une vitrine à tes lectures ?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">Crée ta page en quelques minutes, gratuitement.</p>
          <Link href={isLoggedIn ? "/dashboard" : "/register"}>
            <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-8">
              {isLoggedIn ? "Mon dashboard" : "Créer ma page"}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="relative px-6 py-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center text-xs text-gray-500">
        <span>© {new Date().getFullYear()} ReadShelf</span>
        <div className="flex items-center gap-4">
          <Link href="/mentions-legales" className="hover:text-gray-300 transition-colors">Mentions légales</Link>
          <Link href="/cgu-cgv" className="hover:text-gray-300 transition-colors">CGU/CGV</Link>
          <Link href="/confidentialite" className="hover:text-gray-300 transition-colors">Confidentialité</Link>
        </div>
      </footer>
    </div>
  )
}
