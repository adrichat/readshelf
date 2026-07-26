"use client"

import { useAchievementsUnseenCount } from "./AchievementsProvider"

export function AchievementsBadge() {
  const count = useAchievementsUnseenCount()
  if (count === 0) return null

  return (
    <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0">
      {count > 9 ? "9+" : count}
    </span>
  )
}
