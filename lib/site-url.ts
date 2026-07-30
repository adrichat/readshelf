// Réutilise la base URL déjà utilisée pour les liens d'e-mail (lib/resend.ts)
// et le retour Stripe (app/api/stripe/checkout/route.ts).
export const SITE_URL = process.env.AUTH_URL ?? "http://localhost:3000"
