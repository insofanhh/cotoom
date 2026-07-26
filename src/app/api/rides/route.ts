import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/utils'
import { pusherServer } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      pickupLat, pickupLng, dropoffLat, dropoffLng,
      pickupAddress, dropoffAddress, dropoffName,
      distanceKm, totalPrice, vehicleType,
    } = body

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng || !distanceKm || !totalPrice || !vehicleType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const acceptToken = generateToken(48)

    const ride = await prisma.ride.create({
      data: {
        clientId: session.user.id,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        pickupAddress: pickupAddress ?? '',
        dropoffAddress: dropoffAddress ?? '',
        dropoffName: dropoffName ?? '',
        distanceKm,
        totalPrice,
        vehicleType,
        status: 'SEARCHING',
        acceptToken,
      },
    })

    // Dispatch drivers asynchronously (no await — fire and forget)
    dispatchDrivers(ride.id, vehicleType, acceptToken).catch(console.error)

    return NextResponse.json(ride, { status: 201 })
  } catch (error) {
    console.error('[POST /api/rides]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

async function dispatchDrivers(rideId: string, vehicleType: string, acceptToken: string) {
  // Get available drivers ordered by rating
  const drivers = await prisma.driverProfile.findMany({
    where: {
      status: 'APPROVED',
      isOnline: true,
      isBusy: false,
      vehicleType: vehicleType as any,
    },
    orderBy: { ratingAvg: 'desc' },
    include: { user: { select: { id: true } } },
  })

  if (drivers.length === 0) {
    // No drivers available — cancel after timeout
    setTimeout(async () => {
      const ride = await prisma.ride.findUnique({ where: { id: rideId } })
      if (ride?.status === 'SEARCHING') {
        await prisma.ride.update({ where: { id: rideId }, data: { status: 'CANCELLED' } })
      }
    }, 60000)
    return
  }

  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i]
    const acceptUrl = `${process.env.NEXTAUTH_URL}/driver/accept?rideId=${rideId}&token=${acceptToken}`

    // Send Pusher notification to this driver
    try {
      const currentRide = await prisma.ride.findUnique({ where: { id: rideId } })
      await pusherServer.trigger(
        `private-driver-${driver.user.id}`,
        'ride:new-request',
        {
          rideId,
          acceptUrl,
          acceptToken,
          vehicleType,
          pickup: currentRide?.pickupAddress || 'Vị trí hiện tại',
          dropoff: currentRide?.dropoffAddress || currentRide?.dropoffName || 'Điểm đến',
          price: currentRide?.totalPrice || 0,
        }
      )
    } catch {
      // Pusher not configured yet — skip
    }

    // Wait 15 seconds for acceptance, then try next driver
    await new Promise((resolve) => setTimeout(resolve, 15000))

    // Check if ride was accepted
    const ride = await prisma.ride.findUnique({ where: { id: rideId } })
    if (ride?.status !== 'SEARCHING') {
      return // Accepted or cancelled — stop dispatching
    }
  }

  // All drivers exhausted — cancel
  await prisma.ride.update({
    where: { id: rideId },
    data: { status: 'CANCELLED' },
  })
}
