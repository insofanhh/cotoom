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

    // Broadcast to all matching drivers before responding — background work
    // is killed on serverless hosts (Vercel), so no fire-and-forget here
    await dispatchDrivers(ride, acceptToken).catch(console.error)

    return NextResponse.json(ride, { status: 201 })
  } catch (error) {
    console.error('[POST /api/rides]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

type RideRecord = {
  id: string
  vehicleType: string
  pickupAddress: string | null
  dropoffAddress: string | null
  dropoffName: string | null
  totalPrice: number
}

// Notify every available driver at once; the first to accept wins.
// Must finish before the HTTP response — serverless hosts kill background work.
async function dispatchDrivers(ride: RideRecord, acceptToken: string) {
  const drivers = await prisma.driverProfile.findMany({
    where: {
      status: 'APPROVED',
      isOnline: true,
      isBusy: false,
      vehicleType: ride.vehicleType as any,
    },
    include: { user: { select: { id: true } } },
  })

  if (drivers.length === 0) {
    // No drivers available — cancel right away and tell the client
    await prisma.ride.update({ where: { id: ride.id }, data: { status: 'CANCELLED' } })
    try {
      await pusherServer.trigger(`presence-ride-${ride.id}`, 'ride:status-update', {
        status: 'CANCELLED',
        rideId: ride.id,
      })
    } catch {
      // Pusher not configured — skip
    }
    return
  }

  const payload = {
    rideId: ride.id,
    acceptUrl: `${process.env.NEXTAUTH_URL}/driver/accept?rideId=${ride.id}&token=${acceptToken}`,
    acceptToken,
    vehicleType: ride.vehicleType,
    pickup: ride.pickupAddress || 'Vị trí hiện tại',
    dropoff: ride.dropoffAddress || ride.dropoffName || 'Điểm đến',
    price: ride.totalPrice || 0,
  }

  await Promise.allSettled(
    drivers.map((driver) =>
      pusherServer.trigger(`private-driver-${driver.user.id}`, 'ride:new-request', payload)
    )
  )
}
