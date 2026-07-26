import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

// PATCH /api/driver/location — driver streams GPS position while online.
// Relayed to the active ride's presence channel so the client sees the car move.
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { latitude, longitude } = await req.json()
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ message: 'Invalid coordinates' }, { status: 400 })
    }

    await prisma.driverProfile.update({
      where: { userId: session.user.id },
      data: { latitude, longitude },
    })

    const activeRide = await prisma.ride.findFirst({
      where: {
        driverId: session.user.id,
        status: { in: ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] },
      },
      select: { id: true },
    })

    if (activeRide) {
      try {
        await pusherServer.trigger(`presence-ride-${activeRide.id}`, 'driver:location', {
          latitude,
          longitude,
        })
      } catch {
        // Pusher not configured — position still saved
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PATCH /api/driver/location]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
