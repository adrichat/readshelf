import { auth } from "@/auth"
import { Award, Lock } from "lucide-react"
import { getAchievementsPageData } from "@/lib/achievements"

const CATEGORY_LABELS: Record<string, string> = {
  BOOKS_ADDED: "Bibliothèque",
  BOOKS_READ: "Lecture",
  LOGIN_STREAK: "Fidélité",
}

export default async function AchievementsPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const achievements = await getAchievementsPageData(userId)
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Award className="w-5 h-5 text-amber-600 dark:text-amber-300" />
        <h1 className="text-2xl font-bold">Succès</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        {unlockedCount} / {achievements.length} débloqués
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {achievements.map((a) => {
          const progress = Math.min(100, Math.round((a.value / a.threshold) * 100))
          return (
            <div
              key={a.id}
              className={`rounded-xl border p-4 flex gap-4 ${
                a.unlocked
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]"
              }`}
            >
              <div
                className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-xl ${
                  a.unlocked ? "bg-amber-500/15" : "bg-gray-100 dark:bg-white/5 grayscale opacity-50"
                }`}
              >
                {a.unlocked ? a.icon : <Lock className="w-4 h-4 text-gray-500 dark:text-gray-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">
                  {CATEGORY_LABELS[a.category]}
                </p>
                <p className={`text-sm font-medium ${a.unlocked ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
                  {a.title}
                </p>
                <p className="text-xs text-gray-500 mb-2">{a.description}</p>

                {a.unlocked ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300/80">
                    Débloqué le{" "}
                    {a.unlockedAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500/70"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums shrink-0">
                      {Math.min(a.value, a.threshold)}/{a.threshold}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
