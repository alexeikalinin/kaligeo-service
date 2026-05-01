import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined
}

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any)
}

export const prisma = global.prismaClient ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") global.prismaClient = prisma
