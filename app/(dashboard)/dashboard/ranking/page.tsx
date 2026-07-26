import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Trophy, Eye } from "lucide-react"
import { PremiumSparkle } from "@/components/PremiumSparkle"

// Or, argent, bronze pour le podium — gris pour le reste
const RANK_COLORS = ["text-amber-300", "text-slate-300", "text-amber-600"]

export default async function RankingPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const top = await db.profile.findMany({
    where: {
      profileViews: { gt: 0 },
      // Sans username, pas de page publique à visiter
      user: { username: { not: null } },
    },
    orderBy: { profileViews: "desc" },
    take: 20,
    select: {
      profileViews: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          image: true,
          isPremium: true,
        },
      },
    },
  })

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-5 h-5 text-amber-300" />
        <h1 className="text-2xl font-bold">Classement</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Les profils ReadShelf les plus visités.
      </p>

      {top.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <Trophy className="w-10 h-10 mx-auto mb-4 text-gray-700" />
          <p>Aucun profil visité pour le moment.</p>
          <p className="text-sm text-gray-700 mt-2">
            Partage ta page pour lancer le classement !
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {top.map((p, i) => {
            const username = p.user.username!
            const name = p.user.displayName ?? username
            const isMe = p.user.id === userId
            return (
              <Link
                key={p.user.id}
                href={`/${username}`}
                target="_blank"
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  isMe
                    ? "border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <span
                  className={`w-8 text-center text-lg font-bold tabular-nums shrink-0 ${
                    RANK_COLORS[i] ?? "text-gray-600"
                  }`}
                >
                  {i + 1}
                </span>

                {p.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.user.image}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 flex items-center justify-center text-sm font-bold shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <span className="truncate">{name}</span>
                    {p.user.isPremium && <PremiumSparkle />}
                    {isMe && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 shrink-0 font-normal">
                        Toi
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{username}</p>
                </div>

                <div
                  className="flex items-center gap-1.5 text-sm text-gray-400 shrink-0"
                  title="Vues du profil"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                  <span className="tabular-nums">
                    {p.profileViews.toLocaleString("fr-FR")}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
