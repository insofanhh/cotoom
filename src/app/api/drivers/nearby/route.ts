import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')

    if (!lat || !lng) {
      return NextResponse.json({ message: 'Missing lat or lng' }, { status: 400 })
    }

    const onlineDrivers = await prisma.driverProfile.findMany({
      where: {
        isOnline: true,
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        vehicleType: true,
        vehiclePlate: true,
        latitude: true,
        longitude: true,
        user: { select: { name: true, phone: true } }
      }
    })

    // Filter within 3km
    const nearbyDrivers = onlineDrivers.filter(driver => {
      const dist = calculateDistance(lat, lng, driver.latitude!, driver.longitude!)
      return dist <= 3
    }).map(d => ({
      id: d.id,
      name: d.user.name,
      vehicleType: d.vehicleType,
      vehiclePlate: d.vehiclePlate,
      latitude: d.latitude,
      longitude: d.longitude
    }))

    return NextResponse.json(nearbyDrivers)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
