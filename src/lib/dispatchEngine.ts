import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/utils'
import { pusherServer } from '@/lib/pusher'
import { sendPushToUser } from '@/lib/push'

export type RideRecord = {
  id: string
  vehicleType: string
  pickupLat: number
  pickupLng: number
  dropoffLat: number
  dropoffLng: number
  pickupAddress: string | null
  dropoffAddress: string | null
  dropoffName: string | null
  note: string | null
  distanceKm: number
  totalPrice: number
}

interface RankedDriver {
  id: string
  userId: string
  name: string
  phone: string
  vehiclePlate: string
  ratingAvg: number
  todayTrips: number
  distanceBucket: number // 0: <= 2km, 1: <= 5km, 2: > 5km
  exactDistanceKm: number
}

/**
 * Multi-tier Fair Ranking Algorithm:
 * 1. Distance Zone Bucket (Zone A: 0-2km, Zone B: 2-5km, Zone C: >5km)
 * 2. Driver Rating (ratingAvg DESC)
 * 3. Daily Completed Trips (todayTrips ASC) — Fair order distribution
 * 4. Exact Distance Tie-breaker (exactDistanceKm ASC)
 */
export async function getRankedCandidateDrivers(
  pickupLat: number,
  pickupLng: number,
  vehicleType: string
): Promise<RankedDriver[]> {
  const allDrivers = await prisma.driverProfile.findMany({
    where: {
      status: 'APPROVED',
      isOnline: true,
      isBusy: false,
      vehicleType: vehicleType as any,
    },
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
  })

  if (allDrivers.length === 0) return []

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  // Fetch daily completed trips for all candidate drivers in parallel
  const rankedDrivers: RankedDriver[] = await Promise.all(
    allDrivers.map(async (driver) => {
      const lat = driver.latitude ?? pickupLat
      const lng = driver.longitude ?? pickupLng
      const dist = calculateDistance(lat, lng, pickupLat, pickupLng)

      let bucket = 2 // Zone C: > 5km
      if (dist <= 2.0) bucket = 0 // Zone A: <= 2km
      else if (dist <= 5.0) bucket = 1 // Zone B: 2-5km

      const todayTrips = await prisma.ride.count({
        where: {
          driverId: driver.userId,
          status: 'COMPLETED',
          createdAt: { gte: startOfDay },
        },
      })

      return {
        id: driver.id,
        userId: driver.user.id,
        name: driver.user.name,
        phone: driver.user.phone,
        vehiclePlate: driver.vehiclePlate,
        ratingAvg: driver.ratingAvg || 5.0,
        todayTrips,
        distanceBucket: bucket,
        exactDistanceKm: parseFloat(dist.toFixed(2)),
      }
    })
  )

  // Sort candidates by multi-level priority
  rankedDrivers.sort((a, b) => {
    // 1. Distance Tier (Zone A -> Zone B -> Zone C)
    if (a.distanceBucket !== b.distanceBucket) {
      return a.distanceBucket - b.distanceBucket
    }

    // 2. Rating (Higher rating first)
    if (Math.abs(b.ratingAvg - a.ratingAvg) > 0.01) {
      return b.ratingAvg - a.ratingAvg
    }

    // 3. Daily Completed Trips (Fewer daily trips first for fair order distribution)
    if (a.todayTrips !== b.todayTrips) {
      return a.todayTrips - b.todayTrips
    }

    // 4. Exact Distance Tie-breaker
    return a.exactDistanceKm - b.exactDistanceKm
  })

  return rankedDrivers
}

/**
 * Sequential Fair Dispatch Loop:
 * Offers the ride to candidate drivers ONE AT A TIME with a 15-second window.
 */
export async function dispatchRideSequentially(ride: RideRecord, acceptToken: string) {
  const candidates = await getRankedCandidateDrivers(ride.pickupLat, ride.pickupLng, ride.vehicleType)

  if (candidates.length === 0) {
    await prisma.ride.update({ where: { id: ride.id }, data: { status: 'CANCELLED' } })
    try {
      await pusherServer.trigger(`presence-ride-${ride.id}`, 'ride:status-update', {
        status: 'CANCELLED',
        rideId: ride.id,
        message: 'Không có tài xế nào khả dụng lúc này',
      })
    } catch {}
    return
  }

  const payload = {
    rideId: ride.id,
    acceptUrl: `${process.env.NEXTAUTH_URL}/driver/accept?rideId=${ride.id}&token=${acceptToken}`,
    acceptToken,
    vehicleType: ride.vehicleType,
    pickup: ride.pickupAddress || 'Vị trí hiện tại',
    dropoff: ride.dropoffAddress || ride.dropoffName || 'Điểm đến',
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    dropoffLat: ride.dropoffLat,
    dropoffLng: ride.dropoffLng,
    rideKm: ride.distanceKm,
    price: ride.totalPrice || 0,
    note: ride.note,
  }

  // Iterate sequentially through candidates
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]

    // Verify ride is still searching
    const currentRide = await prisma.ride.findUnique({
      where: { id: ride.id },
      select: { status: true },
    })

    if (!currentRide || currentRide.status !== 'SEARCHING') {
      return // Ride was accepted or cancelled — stop dispatch loop
    }

    // Send Push & Realtime notification to ONLY this current target driver
    try {
      await Promise.allSettled([
        pusherServer.trigger(`private-driver-${candidate.userId}`, 'ride:new-request', {
          ...payload,
          distanceToPickupKm: candidate.exactDistanceKm,
          timeoutSeconds: 15,
        }),
        sendPushToUser(candidate.userId, {
          title: '🛵 Có chuyến xe mới dành cho bạn!',
          body: `${payload.pickup} → ${payload.dropoff} • ${payload.price.toLocaleString('vi-VN')}đ • cách bạn ${candidate.exactDistanceKm} km`,
          url: '/driver/dashboard',
          tag: `ride-request-${ride.id}`,
        }),
      ])
    } catch (err) {
      console.error(`[Dispatch Engine] Error notifying driver ${candidate.userId}:`, err)
    }

    // 15-second window to wait for acceptance
    const WAIT_SECONDS = 15
    let acceptedOrCancelled = false

    for (let sec = 0; sec < WAIT_SECONDS; sec++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const checkState = await prisma.ride.findUnique({
        where: { id: ride.id },
        select: { status: true },
      })

      if (!checkState || checkState.status !== 'SEARCHING') {
        acceptedOrCancelled = true
        break // Candidate accepted or client cancelled
      }
    }

    if (acceptedOrCancelled) {
      return
    }

    // If 15 seconds expired without acceptance:
    // Notify candidate #1 that the offer expired so their dashboard modal closes immediately!
    try {
      await pusherServer.trigger(`private-driver-${candidate.userId}`, 'ride:request-expired', {
        rideId: ride.id,
        message: 'Lượt nhận chuyến của bạn đã hết hạn',
      })
    } catch {}

    console.log(`[Dispatch Engine] 15s window expired for driver ${candidate.name}. Moving to candidate ${i + 2}/${candidates.length}...`)
  }

  // Final check: if no driver accepted after trying all candidates
  const finalCheck = await prisma.ride.findUnique({ where: { id: ride.id }, select: { status: true } })
  if (finalCheck && finalCheck.status === 'SEARCHING') {
    await prisma.ride.update({ where: { id: ride.id }, data: { status: 'CANCELLED' } })
    try {
      await pusherServer.trigger(`presence-ride-${ride.id}`, 'ride:status-update', {
        status: 'CANCELLED',
        rideId: ride.id,
        message: 'Tất cả tài xế đều đang bận, vui lòng thử lại sau',
      })
    } catch {}
  }
}
