import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Temporary diagnostic endpoint — remove after deployment is verified
export async function GET() {
  const info: Record<string, unknown> = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlHasSsl: process.env.DATABASE_URL?.includes('ssl=true') ?? false,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasPusherKey: !!process.env.PUSHER_KEY,
  }

  try {
    const count = await prisma.location.count()
    return NextResponse.json({ db: 'ok', locations: count, ...info })
  } catch (error: any) {
    return NextResponse.json(
      {
        db: 'error',
        errorName: error?.name,
        errorMessage: String(error?.message ?? error).slice(0, 500),
        cause: String(error?.cause?.message ?? '').slice(0, 300),
        ...info,
      },
      { status: 500 }
    )
  }
}
