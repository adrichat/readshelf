import { auth } from "@/auth"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { Sparkles, Check } from "lucide-react"
import { PremiumBuyButton } from "./PremiumBuyButton"

const PREMIUM_FEATURES = [
  "Badge Lecteur Premium sur ton profil",
  "Layouts avancés (étagère, mosaïque)",
  "Polices personnalisées",
  "Effets spéciaux (particules, lueur)",
  "SEO et métadonnées custom",
]

interface Props {
  searchParams: Promise<{ session_id?: string; status?: string }>
}

export default async function PremiumPage({ searchParams }: Props) {
  const session = await auth()
  const userId = session!.user!.id!
  const { session_id, status } = await searchParams

  // Retour de Stripe Checkout : vérifie le paiement côté serveur
  // (le webhook reste la source de vérité en prod, ceci couvre le dev local)
  if (session_id) {
    try {
      const checkout = await stripe.checkout.sessions.retrieve(session_id)
      if (checkout.payment_status === "paid" && checkout.metadata?.userId === userId) {
        await db.user.update({ where: { id: userId }, data: { isPremium: true } })
      }
    } catch {
      // session invalide ou introuvable — on affiche simplement l'état actuel
    }
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isPremium: true },
  })
  const isPremium = user?.isPremium ?? false

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <h1 className="text-2xl font-bold">Premium</h1>
      </div>

      {isPremium ? (
        <div>
          <p className="text-sm text-gray-500 mb-8">Merci pour ton soutien !</p>

          {session_id && (
            <div className="mb-6 p-4 rounded-xl border border-green-500/30 bg-green-500/10 text-sm text-green-700 dark:text-green-300">
              Paiement confirmé — ton compte est maintenant Premium. ✦
            </div>
          )}

          <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5">
            <p className="text-lg font-semibold mb-1">✦ Tu es Lecteur Premium</p>
            <p className="text-sm text-gray-500 mb-5">
              Toutes les options sont débloquées, pour toujours.
            </p>
            <ul className="flex flex-col gap-2.5">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-8">
            Débloque toutes les options de personnalisation. Paiement unique, à vie.
          </p>

          {status === "cancelled" && (
            <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] text-sm text-gray-600 dark:text-gray-400">
              Paiement annulé. Tu peux réessayer quand tu veux.
            </div>
          )}

          <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 mb-6">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold">4,99 €</span>
              <span className="text-sm text-amber-600 dark:text-amber-400">paiement unique</span>
            </div>
            <p className="text-sm text-gray-500 mb-5">Tu le gardes pour toujours.</p>
            <ul className="flex flex-col gap-2.5 mb-6">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <PremiumBuyButton />
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            Paiement sécurisé par Stripe. Carte de test : 4242 4242 4242 4242.
          </p>
        </div>
      )}
    </div>
  )
}
