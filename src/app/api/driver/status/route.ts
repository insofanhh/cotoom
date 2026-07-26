import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { isOnline } = await req.json()

    const profile = await prisma.driverProfile.update({
      where: { userId: session.user.id },
      data: { isOnline },
    })

    return NextResponse.json({ isOnline: profile.isOnline })
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
