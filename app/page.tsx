import { auth } from "@/auth"
import { LandingContent } from "@/components/landing/LandingContent"

export default async function LandingPage() {
  const session = await auth()
  return <LandingContent isLoggedIn={!!session?.user} />
}
