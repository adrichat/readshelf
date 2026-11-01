import { LandingContent } from "@/components/landing/LandingContent"

// Page entièrement statique : la redirection des visiteurs déjà connectés vers
// /dashboard est gérée par le middleware (voir le callback `authorized` dans
// auth.config.ts). Appeler auth() ici forçait un rendu dynamique à chaque
// visite de l'accueil.
export default function LandingPage() {
  return <LandingContent isLoggedIn={false} />
}
