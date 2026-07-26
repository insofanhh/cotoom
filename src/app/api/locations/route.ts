import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const q = searchParams.get('q')

    const where: any = {}
    if (type && type !== 'ALL') where.type = type
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
      ]
    }

    const locations = await prisma.location.findMany({
      where,
      orderBy: { viewCount: 'desc' },
    })

    return NextResponse.json(
      locations.map((l) => ({ ...l, images: (l.images as string[]) ?? [] }))
    )
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
