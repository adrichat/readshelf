import type { MetadataRoute } from "next"
import { db } from "@/lib/db"
import { SITE_URL } from "@/lib/site-url"

// Sans ça, la liste des profils est figée au build : les usernames créés
// après le déploiement n'apparaîtraient dans le sitemap qu'au prochain build.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/cgu-cgv`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.3 },
  ]

  const users = await db.user.findMany({
    where: { username: { not: null } },
    select: { username: true, updatedAt: true },
  })

  const profileRoutes: MetadataRoute.Sitemap = users.map((user) => ({
    url: `${SITE_URL}/${user.username}`,
    lastModified: user.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }))

  return [...staticRoutes, ...profileRoutes]
}
