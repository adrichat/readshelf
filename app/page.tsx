import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { LandingContent } from "@/components/landing/LandingContent"

export default async function LandingPage() {
  const session = await auth()
  if (session?.user) {
    redirect("/dashboard")
  }
  return <LandingContent isLoggedIn={false} />
}
