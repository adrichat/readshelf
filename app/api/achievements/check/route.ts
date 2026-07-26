import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { unlockNewAchievements, getUnseenAchievementCount } from "@/lib/achievements"

// Appelé côté client à chaque navigation dans le dashboard (voir
// AchievementsProvider) — le layout partagé ne se ré-exécute pas à chaque
// changement de page côté serveur, donc c'est ce endpoint qui rattrape les
// déblocages en temps réel plutôt que de compter sur un re-render du layout.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const justUnlocked = await unlockNewAchievements(session.user.id)
  const unseenCount = await getUnseenAchievementCount(session.user.id)

  return NextResponse.json({ justUnlocked, unseenCount })
}
