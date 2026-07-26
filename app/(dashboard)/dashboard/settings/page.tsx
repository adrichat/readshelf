import { auth } from "@/auth"
import { db } from "@/lib/db"
import { SettingsForm } from "./SettingsForm"

export default async function SettingsPage() {
  const session = await auth()
  const [user, profile] = await Promise.all([
    db.user.findUnique({
      where: { id: session!.user!.id! },
      select: { displayName: true, bio: true, username: true, email: true, isPremium: true, image: true },
    }),
    db.profile.findUnique({
      where: { userId: session!.user!.id! },
      select: { socialLinks: true, seoTitle: true, seoDescription: true },
    }),
  ])

  const socialLinks = (profile?.socialLinks ?? {}) as Record<string, string>

  return (
    <div className="p-4 sm:p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-1">Paramètres</h1>
      <p className="text-sm text-gray-500 mb-8">Gère ton compte et les informations de ton profil.</p>
      <SettingsForm
        isPremium={user?.isPremium ?? false}
        initialData={{
          displayName: user?.displayName ?? "",
          bio: user?.bio ?? "",
          image: user?.image ?? null,
          username: user?.username ?? "",
          email: user?.email ?? "",
          goodreads: socialLinks.goodreads ?? "",
          babelio: socialLinks.babelio ?? "",
          instagram: socialLinks.instagram ?? "",
          booknode: socialLinks.booknode ?? "",
          youtube: socialLinks.youtube ?? "",
          spotify: socialLinks.spotify ?? "",
          customLinkTitle: socialLinks.customLinkTitle ?? "",
          customLinkUrl: socialLinks.customLinkUrl ?? "",
          seoTitle: profile?.seoTitle ?? "",
          seoDescription: profile?.seoDescription ?? "",
        }}
      />
    </div>
  )
}
