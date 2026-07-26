import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const drivers = await prisma.driverProfile.findMany({
      include: { user: { select: { name: true, phone: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(drivers)
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { driverId, action } = await req.json()

    if (!driverId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    const profile = await prisma.driverProfile.update({
      where: { id: driverId },
      data: { status: newStatus },
      include: { user: true },
    })

    // If approved, change user role to DRIVER
    if (action === 'approve') {
      await prisma.user.update({
        where: { id: profile.userId },
        data: { role: 'DRIVER' },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
