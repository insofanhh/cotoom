/**
 * dispatchEngine.ts — Database-Driven Sequential Fair Dispatch Engine
 *
 * Architecture:
 * - createDispatchQueue(): called once when ride is created. Ranks all candidates,
 *   saves their userId list to DB (DispatchQueue), and dispatches to driver[0] immediately.
 *
 * - advanceDispatch(): called by POST /api/rides/[id]/dispatch-tick (polled by the
 *   client every 2 seconds while SEARCHING). Checks if the current driver's 15-second
 *   window has expired and advances to the next candidate if so.
 *
 * This avoids relying on setTimeout in serverless handlers (which get killed when the
 * HTTP response is sent). The client's polling loop keeps the engine alive.
 */

import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/utils'
import { pusherServer } from '@/lib/pusher'
import { sendPushToUser } from '@/lib/push'

const DRIVER_TIMEOUT_SECONDS = 15

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
  userId: string
  name: string
  ratingAvg: number
  todayTrips: number
  distanceBucket: number // 0: ≤2km, 1: ≤5km, 2: >5km
  exactDistanceKm: number
}

// ─── Ranking ─────────────────────────────────────────────────────────────────

async function getRankedCandidateUserIds(
  pickupLat: number,
  pickupLng: number,
  vehicleType: string
): Promise<{ userId: string; exactDistanceKm: number }[]> {
  const allDrivers = await prisma.driverProfile.findMany({
    where: {
      status: 'APPROVED',
      isOnline: true,
      isBusy: false,
      vehicleType: vehicleType as any,
    },
    include: { user: { select: { id: true, name: true } } },
  })

  if (allDrivers.length === 0) return []

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const ranked: RankedDriver[] = await Promise.all(
    allDrivers.map(async (driver) => {
      const lat = driver.latitude ?? pickupLat
      const lng = driver.longitude ?? pickupLng
      const dist = calculateDistance(lat, lng, pickupLat, pickupLng)

      let bucket = 2
      if (dist <= 2.0) bucket = 0
      else if (dist <= 5.0) bucket = 1

      const todayTrips = await prisma.ride.count({
        where: { driverId: driver.userId, status: 'COMPLETED', createdAt: { gte: startOfDay } },
      })

      return {
        userId: driver.user.id,
        name: driver.user.name,
        ratingAvg: driver.ratingAvg || 5.0,
        todayTrips,
        distanceBucket: bucket,
        exactDistanceKm: parseFloat(dist.toFixed(2)),
      }
    })
  )

  ranked.sort((a, b) => {
    if (a.distanceBucket !== b.distanceBucket) return a.distanceBucket - b.distanceBucket
    if (Math.abs(b.ratingAvg - a.ratingAvg) > 0.01) return b.ratingAvg - a.ratingAvg
    if (a.todayTrips !== b.todayTrips) return a.todayTrips - b.todayTrips
    return a.exactDistanceKm - b.exactDistanceKm
  })

  return ranked.map((d) => ({ userId: d.userId, exactDistanceKm: d.exactDistanceKm }))
}

// ─── Notify single driver ─────────────────────────────────────────────────────

async function notifyDriver(
  userId: string,
  exactDistanceKm: number,
  payload: Record<string, any>
) {
  await Promise.allSettled([
    pusherServer.trigger(`private-driver-${userId}`, 'ride:new-request', {
      ...payload,
      distanceToPickupKm: exactDistanceKm,
      timeoutSeconds: DRIVER_TIMEOUT_SECONDS,
    }),
    sendPushToUser(userId, {
      title: '🛵 Có chuyến xe mới dành cho bạn!',
      body: `${payload.pickup} → ${payload.dropoff} • ${Number(payload.price).toLocaleString('vi-VN')}đ • cách bạn ${exactDistanceKm} km`,
      url: '/driver/dashboard',
      tag: `ride-request-${payload.rideId}`,
    }),
  ])
}

async function expireDriver(userId: string, rideId: string) {
  await pusherServer
    .trigger(`private-driver-${userId}`, 'ride:request-expired', {
      rideId,
      message: 'Lượt nhận chuyến của bạn đã hết hạn',
    })
    .catch(() => {})
}

async function cancelRide(rideId: string, message: string) {
  await prisma.ride.update({ where: { id: rideId }, data: { status: 'CANCELLED' } }).catch(() => {})
  await pusherServer
    .trigger(`presence-ride-${rideId}`, 'ride:status-update', {
      status: 'CANCELLED',
      rideId,
      message,
    })
    .catch(() => {})
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called once when a ride is created.
 * Ranks candidates, persists queue to DB, dispatches to the first driver immediately.
 */
export async function createDispatchQueue(ride: RideRecord, acceptToken: string) {
  const candidates = await getRankedCandidateUserIds(ride.pickupLat, ride.pickupLng, ride.vehicleType)

  if (candidates.length === 0) {
    await cancelRide(ride.id, 'Không có tài xế nào khả dụng lúc này')
    return
  }

  const ridePayload = {
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

  // Save queue to DB
  await prisma.dispatchQueue.create({
    data: {
      rideId: ride.id,
      candidateIds: candidates.map((c) => c.userId),
      currentIndex: 0,
      dispatchedAt: new Date(),
      acceptToken,
      ridePayload,
    },
  })

  // Dispatch first driver immediately
  const first = candidates[0]
  await notifyDriver(first.userId, first.exactDistanceKm, ridePayload)
}

/**
 * Called by POST /api/rides/[id]/dispatch-tick (polled by client every 2s while SEARCHING).
 * Returns the current ride status so the client knows when to stop polling.
 */
export async function advanceDispatch(rideId: string): Promise<{
  rideStatus: string
  message?: string
}> {
  // Check ride status first
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, select: { status: true } })
  if (!ride) return { rideStatus: 'CANCELLED', message: 'Chuyến xe không tồn tại' }
  if (ride.status !== 'SEARCHING') return { rideStatus: ride.status }

  // Load queue
  const queue = await prisma.dispatchQueue.findUnique({ where: { rideId } })
  if (!queue) return { rideStatus: 'SEARCHING' }

  const candidateIds = queue.candidateIds as string[]
  const now = new Date()
  const elapsedSeconds = (now.getTime() - queue.dispatchedAt.getTime()) / 1000

  // Current driver still within window — nothing to advance
  if (elapsedSeconds < DRIVER_TIMEOUT_SECONDS) {
    return { rideStatus: 'SEARCHING' }
  }

  // Window expired — expire the current driver's notification
  const currentUserId = candidateIds[queue.currentIndex]
  if (currentUserId) {
    await expireDriver(currentUserId, rideId)
  }

  const nextIndex = queue.currentIndex + 1

  // Tried all candidates — cancel the ride
  if (nextIndex >= candidateIds.length) {
    await prisma.dispatchQueue.delete({ where: { rideId } }).catch(() => {})
    await cancelRide(rideId, 'Tất cả tài xế đều đang bận, vui lòng thử lại sau')
    return { rideStatus: 'CANCELLED', message: 'Không tìm được tài xế' }
  }

  // Build fresh candidate list with current distances (drivers may have moved)
  const freshCandidates = await getRankedCandidateUserIds(
    (queue.ridePayload as any).pickupLat,
    (queue.ridePayload as any).pickupLng,
    (queue.ridePayload as any).vehicleType
  )

  // Find next driver from queue (respect original order, skip tried ones)
  const remainingCandidateIds = candidateIds.slice(nextIndex)
  let nextUserId: string | null = null
  let nextDistanceKm = 0

  for (const uid of remainingCandidateIds) {
    // Only offer to drivers who are still online + not busy
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: uid },
      select: { isOnline: true, isBusy: true, status: true, latitude: true, longitude: true },
    })
    if (profile?.isOnline && !profile.isBusy && profile.status === 'APPROVED') {
      nextUserId = uid
      const fresh = freshCandidates.find((c) => c.userId === uid)
      nextDistanceKm = fresh?.exactDistanceKm ?? 0
      break
    }
  }

  if (!nextUserId) {
    // No remaining available driver
    await prisma.dispatchQueue.delete({ where: { rideId } }).catch(() => {})
    await cancelRide(rideId, 'Tất cả tài xế đều đang bận, vui lòng thử lại sau')
    return { rideStatus: 'CANCELLED', message: 'Không tìm được tài xế' }
  }

  // Advance queue and notify next driver
  const nextIndexInQueue = candidateIds.indexOf(nextUserId)
  await prisma.dispatchQueue.update({
    where: { rideId },
    data: { currentIndex: nextIndexInQueue, dispatchedAt: new Date() },
  })

  await notifyDriver(nextUserId, nextDistanceKm, queue.ridePayload as Record<string, any>)
  console.log(`[DispatchEngine] Advanced to driver ${nextUserId} (index ${nextIndexInQueue}) for ride ${rideId}`)

  return { rideStatus: 'SEARCHING' }
}
