import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { BookOpen, Library, Palette, ArrowRight } from "lucide-react"
import { CopyLinkButton } from "@/components/dashboard/CopyLinkButton"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const [bookCount, readingCount, readCount] = await Promise.all([
    db.userBook.count({ where: { userId } }),
    db.userBook.count({ where: { userId, status: "READING" } }),
    db.userBook.count({ where: { userId, status: "READ" } }),
  ])

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">
        Bonjour {session!.user!.name?.split(" ")[0]} 👋
      </h1>
      <div className="text-gray-500 text-sm mb-8 flex items-center gap-3 flex-wrap">
        <span>
          Ton profil est accessible sur{" "}
          <Link href={`/${session!.user!.username}`} className="text-amber-600 dark:text-amber-400 hover:underline" target="_blank">
            readshelf.dev/{session!.user!.username ?? "…"}
          </Link>
        </span>
        <CopyLinkButton username={session!.user!.username ?? ""} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-10">
        {[
          { label: "Total livres", value: bookCount },
          { label: "En cours", value: readingCount },
          { label: "Lus", value: readCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-4 sm:p-5">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
        Actions rapides
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/dashboard/library">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-5 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors flex flex-col gap-3">
            <Library className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium">Ma bibliothèque</p>
              <p className="text-xs text-gray-500">Gérer mes livres</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 self-end" />
          </div>
        </Link>
        <Link href="/dashboard/appearance">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-5 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors flex flex-col gap-3">
            <Palette className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium">Apparence</p>
              <p className="text-xs text-gray-500">Personnaliser mon profil</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 self-end" />
          </div>
        </Link>
        <Link href={`/${session!.user!.username}`} target="_blank">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-5 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors flex flex-col gap-3">
            <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium">Mon profil public</p>
              <p className="text-xs text-gray-500">Voir ma page</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 self-end" />
          </div>
        </Link>
      </div>
    </div>
  )
}
