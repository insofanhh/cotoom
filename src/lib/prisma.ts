import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client'

function parseConnectionString(url: string) {
  const parsed = new URL(url)
  // Cloud MySQL (TiDB, Aiven, PlanetScale...) requires TLS: append ?ssl=true to DATABASE_URL
  const useSsl = ['true', '1'].includes(parsed.searchParams.get('ssl') ?? '')
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306'),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    connectionLimit: 5,
    ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const adapter = new PrismaMariaDb(parseConnectionString(databaseUrl))
  return new PrismaClient({ adapter } as any)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
