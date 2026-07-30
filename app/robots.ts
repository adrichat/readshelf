import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/login", "/register", "/forgot-password", "/reset-password", "/setup", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
