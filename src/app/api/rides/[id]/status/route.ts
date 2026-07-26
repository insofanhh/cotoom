import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher'
import type { RideStatus } from '@/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status }: { status: RideStatus } = body

    if (!['ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
    }

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { client: true }
    })

    if (!ride) {
      return NextResponse.json({ message: 'Ride not found' }, { status: 404 })
    }

    // Update ride
    const updatedRide = await prisma.ride.update({
      where: { id },
      data: { status }
    })

    // If completed or cancelled, free up the driver
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      if (ride.driverId) {
        if (status === 'COMPLETED') {
          await prisma.driverProfile.update({
            where: { userId: ride.driverId },
            data: { 
              isBusy: false,
              totalTrips: { increment: 1 },
              totalRevenue: { increment: ride.totalPrice }
            }
          })
        } else {
          await prisma.driverProfile.update({
            where: { userId: ride.driverId },
            data: { isBusy: false }
          })
        }
      }
    }

    // Notify client
    try {
      await pusherServer.trigger(`presence-ride-${id}`, 'ride:status-update', {
        status,
        rideId: id
      })
    } catch {
      // Ignore pusher errors
    }

    return NextResponse.json(updatedRide)
  } catch (error) {
    console.error('[PATCH /api/rides/status]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
