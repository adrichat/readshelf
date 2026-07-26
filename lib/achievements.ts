import { db } from "@/lib/db"

export type AchievementCategory = "BOOKS_ADDED" | "BOOKS_READ" | "LOGIN_STREAK"

export interface AchievementDef {
  id: string
  category: AchievementCategory
  threshold: number
  title: string
  description: string
  icon: string
}

// Seuils croissants par catégorie — ajouter une entrée suffit pour un nouveau palier.
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "books_added_10", category: "BOOKS_ADDED", threshold: 10, icon: "📚", title: "Collectionneur", description: "Ajoute 10 livres à ta bibliothèque" },
  { id: "books_added_50", category: "BOOKS_ADDED", threshold: 50, icon: "🗄️", title: "Archiviste", description: "Ajoute 50 livres à ta bibliothèque" },
  { id: "books_added_100", category: "BOOKS_ADDED", threshold: 100, icon: "🏛️", title: "Bibliothécaire", description: "Ajoute 100 livres à ta bibliothèque" },
  { id: "books_read_10", category: "BOOKS_READ", threshold: 10, icon: "📖", title: "Lecteur assidu", description: "Termine 10 livres" },
  { id: "books_read_50", category: "BOOKS_READ", threshold: 50, icon: "🔖", title: "Dévoreur de pages", description: "Termine 50 livres" },
  { id: "books_read_100", category: "BOOKS_READ", threshold: 100, icon: "🐛", title: "Rat de bibliothèque", description: "Termine 100 livres" },
  { id: "login_streak_7", category: "LOGIN_STREAK", threshold: 7, icon: "🔥", title: "Habitué", description: "Connecte-toi 7 jours d'affilée" },
  { id: "login_streak_30", category: "LOGIN_STREAK", threshold: 30, icon: "⚡", title: "Fidèle au poste", description: "Connecte-toi 30 jours d'affilée" },
]

async function getValues(userId: string): Promise<Record<AchievementCategory, number>> {
  const [booksAdded, booksRead, user] = await Promise.all([
    db.userBook.count({ where: { userId } }),
    db.userBook.count({ where: { userId, status: "READ" } }),
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { currentStreak: true, bestStreak: true } }),
  ])
  return {
    BOOKS_ADDED: booksAdded,
    BOOKS_READ: booksRead,
    // Le meilleur streak atteint compte aussi, pas seulement le streak en cours,
    // pour ne pas "reperdre" un succès déjà mérité si le streak actuel casse.
    LOGIN_STREAK: Math.max(user.currentStreak, user.bestStreak),
  }
}

// Débloque en base les succès qui viennent de franchir leur seuil et renvoie
// uniquement ceux-là (utilisé pour déclencher les toasts de déblocage).
export async function unlockNewAchievements(userId: string): Promise<AchievementDef[]> {
  const [values, unlockedRows] = await Promise.all([
    getValues(userId),
    db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ])
  const unlockedIds = new Set(unlockedRows.map((r) => r.achievementId))
  const toUnlock = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id) && values[a.category] >= a.threshold)

  if (toUnlock.length > 0) {
    await db.userAchievement.createMany({
      data: toUnlock.map((a) => ({ userId, achievementId: a.id })),
      skipDuplicates: true,
    })
  }
  return toUnlock
}

// Nombre de succès débloqués mais pas encore vus (pastille de notification)
export async function getUnseenAchievementCount(userId: string): Promise<number> {
  return db.userAchievement.count({ where: { userId, seenAt: null } })
}

export interface AchievementStatus extends AchievementDef {
  value: number
  unlocked: boolean
  unlockedAt: Date | null
}

// Données de la page /dashboard/achievements : rattrape les déblocages en retard,
// renvoie la progression complète, et marque tout comme vu (efface la pastille).
export async function getAchievementsPageData(userId: string): Promise<AchievementStatus[]> {
  await unlockNewAchievements(userId)

  const [values, rows] = await Promise.all([
    getValues(userId),
    db.userAchievement.findMany({ where: { userId } }),
  ])

  const unseenIds = rows.filter((r) => !r.seenAt).map((r) => r.id)
  if (unseenIds.length > 0) {
    await db.userAchievement.updateMany({ where: { id: { in: unseenIds } }, data: { seenAt: new Date() } })
  }

  const unlockedMap = new Map(rows.map((r) => [r.achievementId, r.unlockedAt]))
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    value: values[a.category],
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }))
}
