import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient() {
  // On parle au pooler Supabase en mode transaction (port 6543), pas à
  // Postgres en direct : côté serveur une connexion client est bon marché
  // (max_client_conn est large), c'est la poignée de main TLS depuis le
  // lambda qui coûte cher — surtout vers eu-west-1.
  //
  // `max: 1` sérialisait en réalité TOUTES les requêtes : un
  // `Promise.all([q1, q2, q3])` attendait la seule connexion disponible et
  // s'exécutait en trois allers-retours au lieu d'un. On en garde assez pour
  // que le parallélisme écrit dans le code existe vraiment.
  //
  // `idleTimeoutMillis` est volontairement long : fermer la connexion au bout
  // de 10 s obligeait à refaire TCP + TLS (≈3 allers-retours transatlantiques)
  // à la première requête de presque chaque navigation.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 60_000,
    // Ne pas laisser une requête bloquée retenir le rendu indéfiniment.
    connectionTimeoutMillis: 10_000,
  })
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

// Réutiliser le client entre invocations évite de reconstruire le pool (et donc
// de refaire la poignée de main) à chaque requête sur un lambda déjà chaud.
export const db = globalForPrisma.prisma ?? createClient()

globalForPrisma.prisma = db
