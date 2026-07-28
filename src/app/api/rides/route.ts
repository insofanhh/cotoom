import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/utils'
import { getPricePerKm, computePrice } from '@/lib/pricing'
import { createDispatchQueue } from '@/lib/dispatchEngine'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      pickupAddress,
      dropoffAddress,
      dropoffName,
      distanceKm,
      vehicleType,
      note,
    } = body

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng || !distanceKm || !vehicleType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    // Price computed server-side — never trusted from client.
    const rates = await getPricePerKm()
    const rate = rates[vehicleType as keyof typeof rates]
    if (!rate) {
      return NextResponse.json({ message: 'Invalid vehicle type' }, { status: 400 })
    }
    const totalPrice = computePrice(rate, distanceKm)
    const acceptToken = generateToken(48)

    // Block duplicate rides — client cannot have more than one active ride at a time
    const existingRide = await prisma.ride.findFirst({
      where: {
        clientId: session.user.id,
        status: { in: ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] },
      },
      select: { id: true, status: true },
    })
    if (existingRide) {
      return NextResponse.json(
        { message: 'Bạn đang có chuyến xe đang diễn ra', existingRideId: existingRide.id },
        { status: 409 }
      )
    }

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
        note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 300) : null,
        distanceKm,
        totalPrice,
        vehicleType,
        status: 'SEARCHING',
        acceptToken,
      },
    })

    // Await createDispatchQueue — this runs within the HTTP handler so it completes
    // before the response is sent. It creates the DB queue and sends the first notification.
    // Subsequent dispatch advances happen via /api/rides/[id]/dispatch-tick polling.
    await createDispatchQueue(ride, acceptToken)

    return NextResponse.json(ride, { status: 201 })
  } catch (error) {
    console.error('[POST /api/rides]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
