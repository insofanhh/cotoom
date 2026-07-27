import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { auth } from '@/lib/auth'
import { sendPushToUser } from '@/lib/push'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/rides/[id]/accept?token=... — driver acceptance link
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/driver/dashboard', req.url))
    }

    const ride = await prisma.ride.findUnique({ where: { id } })

    if (!ride || ride.acceptToken !== token || ride.status !== 'SEARCHING') {
      return NextResponse.redirect(new URL('/driver/dashboard?error=expired', req.url))
    }

    // Identify the driver from the logged-in session — never trust a driverId in the URL
    const session = await auth()
    const driverId = session?.user?.id
    if (!driverId) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverId } })
    if (!driverProfile || driverProfile.status !== 'APPROVED') {
      return NextResponse.redirect(new URL('/driver/dashboard?error=invalid', req.url))
    }

    // Accept the ride — atomic claim so concurrent accepts can't double-assign
    const claimed = await prisma.ride.updateMany({
      where: { id, acceptToken: token, status: 'SEARCHING' },
      data: { status: 'ACCEPTED', driverId },
    })
    if (claimed.count === 0) {
      return NextResponse.redirect(new URL('/driver/dashboard?error=expired', req.url))
    }
    const updatedRide = (await prisma.ride.findUnique({ where: { id } }))!

    // Mark driver as busy
    await prisma.driverProfile.update({
      where: { userId: driverId },
      data: { isBusy: true },
    })

    // Notify client via Pusher
    try {
      const driver = await prisma.user.findUnique({
        where: { id: driverId },
        include: { driverProfile: { select: { vehiclePlate: true, ratingAvg: true, latitude: true, longitude: true } } },
      })
      await pusherServer.trigger(`presence-ride-${id}`, 'ride:driver-found', {
        driver: {
          id: driverId,
          name: driver?.name,
          phone: driver?.phone,
          vehiclePlate: driver?.driverProfile?.vehiclePlate,
          vehicleType: updatedRide.vehicleType,
          rating: driver?.driverProfile?.ratingAvg,
          latitude: driver?.driverProfile?.latitude,
          longitude: driver?.driverProfile?.longitude,
        }
      })
    } catch {
      // Pusher not configured — skip
    }

    if (updatedRide.clientId) {
      await sendPushToUser(updatedRide.clientId, {
        title: '✅ Tài xế đã nhận chuyến!',
        body: 'Tài xế đang trên đường đến đón bạn.',
        url: `/ride/${id}`,
        tag: `ride-${id}`,
      })
    }

    return NextResponse.redirect(new URL('/driver/dashboard?accepted=1', req.url))
  } catch (error) {
    console.error('[GET /api/rides/accept]', error)
    return NextResponse.redirect(new URL('/driver/dashboard?error=server', req.url))
  }
}

// POST /api/rides/[id]/accept — API-based acceptance (from Pusher button in driver app)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const driverId = session.user.id

    const body = await req.json()
    const { acceptToken } = body

    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverId } })
    if (!driverProfile || driverProfile.status !== 'APPROVED') {
      return NextResponse.json({ message: 'Tài khoản chưa được phê duyệt hoặc đang bị đóng băng' }, { status: 403 })
    }

    // Atomic claim — with broadcast dispatch several drivers can race, only one wins
    const claimed = await prisma.ride.updateMany({
      where: { id, acceptToken, status: 'SEARCHING' },
      data: { status: 'ACCEPTED', driverId },
    })
    if (claimed.count === 0) {
      return NextResponse.json({ message: 'Ride unavailable or expired' }, { status: 409 })
    }

    const updatedRide = (await prisma.ride.findUnique({ where: { id } }))!

    await prisma.driverProfile.update({
      where: { userId: driverId },
      data: { isBusy: true },
    })

    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      include: { driverProfile: { select: { vehiclePlate: true, ratingAvg: true, latitude: true, longitude: true } } },
    })

    try {
      await pusherServer.trigger(`presence-ride-${id}`, 'ride:driver-found', {
        driver: {
          id: driverId,
          name: driver?.name,
          phone: driver?.phone,
          vehiclePlate: driver?.driverProfile?.vehiclePlate,
          vehicleType: updatedRide.vehicleType,
          rating: driver?.driverProfile?.ratingAvg,
          latitude: driver?.driverProfile?.latitude,
          longitude: driver?.driverProfile?.longitude,
        }
      })
    } catch { }

    if (updatedRide.clientId) {
      await sendPushToUser(updatedRide.clientId, {
        title: '✅ Tài xế đã nhận chuyến!',
        body: `${driver?.name ?? 'Tài xế'} (${driver?.driverProfile?.vehiclePlate ?? ''}) đang trên đường đến đón bạn.`,
        url: `/ride/${id}`,
        tag: `ride-${id}`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
