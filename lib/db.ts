import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient() {
  // Small pool per serverless instance: DATABASE_URL points at Supabase's
  // transaction-mode pooler, which already multiplexes many clients — each
  // lambda instance only needs a handful of local connections.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 3 })
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
