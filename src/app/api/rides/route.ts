import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/utils'
import { getPricePerKm, computePrice } from '@/lib/pricing'
import { dispatchRideSequentially } from '@/lib/dispatchEngine'

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

    // Price is computed server-side from admin settings — never trusted from the client.
    // Formula: rate per km x routed distance.
    const rates = await getPricePerKm()
    const rate = rates[vehicleType as keyof typeof rates]
    if (!rate) {
      return NextResponse.json({ message: 'Invalid vehicle type' }, { status: 400 })
    }
    const totalPrice = computePrice(rate, distanceKm)

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
        note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 300) : null,
        distanceKm,
        totalPrice,
        vehicleType,
        status: 'SEARCHING',
        acceptToken,
      },
    })

    // Sequential Fair Dispatch: rank drivers by distance tier, rating, and daily trip balance, then offer one by one
    dispatchRideSequentially(ride, acceptToken).catch(console.error)

    return NextResponse.json(ride, { status: 201 })
  } catch (error) {
    console.error('[POST /api/rides]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
