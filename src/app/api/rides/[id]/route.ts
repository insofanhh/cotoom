import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, phone: true } },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            driverProfile: {
              select: {
                vehiclePlate: true,
                latitude: true,
                longitude: true
              }
            }
          }
        }
      }
    })

    if (!ride) {
      return NextResponse.json({ message: 'Ride not found' }, { status: 404 })
    }

    // Security check: only client or driver can view the ride
    if (ride.clientId !== session.user.id && ride.driverId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(ride)
  } catch (error) {
    console.error('[GET /api/rides/[id]]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
