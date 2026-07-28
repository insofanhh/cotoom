/**
 * GET /api/rides/active
 *
 * Returns the current client's active ride (SEARCHING, ACCEPTED, ARRIVED, IN_PROGRESS)
 * along with driver info if the ride has been accepted.
 * Used by RideFlow on mount to restore the flow state when the client navigates back.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const ride = await prisma.ride.findFirst({
      where: {
        clientId: session.user.id,
        status: { in: ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] },
      },
      include: {
        driver: {
          include: {
            driverProfile: {
              select: { vehiclePlate: true, ratingAvg: true, vehicleType: true, latitude: true, longitude: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!ride) {
      return NextResponse.json({ ride: null })
    }

    return NextResponse.json({
      ride: {
        id: ride.id,
        status: ride.status,
        vehicleType: ride.vehicleType,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        dropoffLat: ride.dropoffLat,
        dropoffLng: ride.dropoffLng,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        dropoffName: ride.dropoffName,
        distanceKm: ride.distanceKm,
        totalPrice: ride.totalPrice,
        driver: ride.driver
          ? {
              id: ride.driver.id,
              name: ride.driver.name,
              phone: ride.driver.phone,
              vehiclePlate: ride.driver.driverProfile?.vehiclePlate ?? '',
              vehicleType: ride.driver.driverProfile?.vehicleType ?? ride.vehicleType,
              rating: ride.driver.driverProfile?.ratingAvg ?? 5,
              latitude: ride.driver.driverProfile?.latitude ?? null,
              longitude: ride.driver.driverProfile?.longitude ?? null,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('[GET /api/rides/active]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
