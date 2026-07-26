"use client"

import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  // La session (JWT) ne change qu'à la connexion ou via update() explicite :
  // pas besoin de la refetch à chaque fois qu'un onglet reprend le focus
  // (ça évite aussi la rafale de requêtes provoquée par la synchronisation
  // entre onglets quand refetchOnWindowFocus est actif).
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
}
