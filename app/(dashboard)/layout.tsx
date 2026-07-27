import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BookOpen, LogOut, ExternalLink, Sparkles } from "lucide-react"
import { signOut } from "@/auth"
import { db } from "@/lib/db"
import { NAV_ITEMS } from "@/components/dashboard/nav-items"
import { MobileNav } from "@/components/dashboard/MobileNav"
import { ThemeToggle } from "@/components/dashboard/ThemeToggle"
import { AchievementsProvider } from "@/components/dashboard/AchievementsProvider"
import { AchievementsBadge } from "@/components/dashboard/AchievementsBadge"
import { getUnseenAchievementCount } from "@/lib/achievements"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  // Vérifie le username directement en BDD (plus fiable que le JWT)
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, isPremium: true },
  })
  if (!dbUser?.username) redirect("/setup")

  // Valeur initiale pour le premier rendu (évite un flash à 0) — le
  // rattrapage en temps réel des déblocages est géré côté client par
  // AchievementsProvider (voir ce fichier pour le pourquoi)
  const unseenAchievements = await getUnseenAchievementCount(session.user.id)

  const signOutForm = (
    <form action={async () => { "use server"; await signOut({ redirectTo: "/" }) }}>
      <button
        type="submit"
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        Déconnexion
      </button>
    </form>
  )

  return (
    <AchievementsProvider initialUnseenCount={unseenAchievements}>
      {/* h-dvh + overflow-hidden : seul le contenu principal défile,
          la sidebar et la barre du haut restent toujours visibles */}
      <div className="h-dvh bg-white dark:bg-[#0a0a0a] flex overflow-hidden">
        {/* Sidebar — desktop uniquement, remplacée par le drawer sur mobile */}
        <aside className="hidden md:flex w-56 border-r border-gray-200 dark:border-white/5 flex-col p-4 shrink-0 overflow-y-auto">
          <div className="flex items-center gap-2 px-2 mb-8">
            <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-sm">ReadShelf</span>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {href === "/dashboard/achievements" && <AchievementsBadge />}
              </Link>
            ))}
          </nav>

          {/* Rappel du plan — visible uniquement en compte gratuit */}
          {!dbUser.isPremium && (
            <Link
              href="/dashboard/premium"
              className="mb-3 block p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Compte gratuit
              </span>
              <span className="block text-xs text-gray-500 leading-relaxed">
                Débloque layouts, polices et effets — 4,99 € à vie.
              </span>
            </Link>
          )}

          <div className="flex flex-col gap-1 border-t border-gray-200 dark:border-white/5 pt-4">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs text-gray-500">Apparence</span>
              <ThemeToggle />
            </div>
            {signOutForm}
          </div>
        </aside>

        {/* Main content — unique zone de défilement */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Top bar — visible sur toutes les pages du dashboard */}
          <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md">
            {/* Burger + logo — mobile uniquement */}
            <div className="flex items-center gap-2 md:hidden">
              <MobileNav isPremium={dbUser.isPremium} signOutSlot={signOutForm} />
              <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-sm">ReadShelf</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href={`/${dbUser.username}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Voir mon profil
              </Link>
              <ThemeToggle className="md:hidden" />
            </div>
          </header>
          <div className="flex-1">{children}</div>
        </main>
      </div>
    </AchievementsProvider>
  )
}
