import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/utils'
import { DriverDashboardClient } from './DriverDashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard Tài xế' }

export default async function DriverDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'DRIVER' && session.user.role !== 'ADMIN') redirect('/')

  const [profile, adminZaloSetting] = await Promise.all([
    prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.setting.findUnique({
      where: { key: 'admin_zalo_phone' },
    }),
  ])

  if (!profile) redirect('/driver/register')

  // "Today" in Vietnam time (UTC+7) regardless of server timezone
  const VN_OFFSET_MS = 7 * 3600 * 1000
  const nowVN = new Date(Date.now() + VN_OFFSET_MS)
  const startOfTodayVN = new Date(
    Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate()) - VN_OFFSET_MS
  )
  const startOf7Days = new Date(startOfTodayVN.getTime() - 6 * 86400000)

  const [activeRide, todayAgg, weekAgg, recentRides] = await Promise.all([
    prisma.ride.findFirst({
      where: {
        driverId: session.user.id,
        status: { in: ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] },
      },
      include: { client: { select: { name: true, phone: true } } },
    }),
    prisma.ride.aggregate({
      where: { driverId: session.user.id, status: 'COMPLETED', updatedAt: { gte: startOfTodayVN } },
      _count: true,
      _sum: { totalPrice: true },
    }),
    prisma.ride.aggregate({
      where: { driverId: session.user.id, status: 'COMPLETED', updatedAt: { gte: startOf7Days } },
      _count: true,
      _sum: { totalPrice: true },
    }),
    prisma.ride.findMany({
      where: { driverId: session.user.id, status: { in: ['COMPLETED', 'CANCELLED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        dropoffName: true,
        dropoffAddress: true,
        totalPrice: true,
        updatedAt: true,
        review: { select: { rating: true } },
      },
    }),
  ])

  // A driver arriving from a push notification missed the realtime event —
  // hydrate the freshest still-claimable request so the card shows anyway.
  let pendingRide: any = null
  if (!activeRide && profile.status === 'APPROVED' && profile.isOnline && !profile.isBusy) {
    const activeQueue = await prisma.dispatchQueue.findFirst({
      where: {
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (activeQueue) {
      const candidateIds = (activeQueue.candidateIds as string[]) || []
      const currentCandidateId = candidateIds[activeQueue.currentIndex]

      if (currentCandidateId === session.user.id) {
        const ride = await prisma.ride.findUnique({
          where: { id: activeQueue.rideId },
          select: { status: true },
        })

        if (ride?.status === 'SEARCHING') {
          const payload = activeQueue.ridePayload as any
          const elapsed = (Date.now() - new Date(activeQueue.dispatchedAt).getTime()) / 1000
          const remainingTimeout = Math.max(1, Math.round(15 - elapsed))

          pendingRide = {
            ...payload,
            timeoutSeconds: remainingTimeout,
            distanceToPickupKm:
              profile.latitude != null && profile.longitude != null && payload.pickupLat != null && payload.pickupLng != null
                ? parseFloat(
                    calculateDistance(profile.latitude, profile.longitude, payload.pickupLat, payload.pickupLng).toFixed(1)
                  )
                : null,
          }
        }
      }
    } else {
      const p = await prisma.ride.findFirst({
        where: {
          status: 'SEARCHING',
          vehicleType: profile.vehicleType,
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
        },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      if (p) {
        const clientName = p.client?.name ?? 'khách'
        pendingRide = {
          rideId: p.id,
          acceptToken: p.acceptToken,
          vehicleType: p.vehicleType,
          pickup: `Vị trí hiện tại của ${clientName}`,
          dropoff: p.dropoffAddress || p.dropoffName || 'Điểm đến',
          pickupLat: p.pickupLat,
          pickupLng: p.pickupLng,
          dropoffLat: p.dropoffLat,
          dropoffLng: p.dropoffLng,
          rideKm: p.distanceKm,
          price: p.totalPrice,
          note: p.note,
          timeoutSeconds: 15,
          distanceToPickupKm:
            profile.latitude != null && profile.longitude != null
              ? parseFloat(
                  calculateDistance(profile.latitude, profile.longitude, p.pickupLat, p.pickupLng).toFixed(1)
                )
              : null,
        }
      }
    }
  }

  return (
    <DriverDashboardClient
      profile={profile}
      userId={session.user.id}
      userName={session.user.name}
      adminZaloPhone={adminZaloSetting?.value || ''}
      initialActiveRide={activeRide}
      initialPendingRide={pendingRide}
      earnings={{
        todayTrips: todayAgg._count,
        todayRevenue: todayAgg._sum.totalPrice ?? 0,
        weekTrips: weekAgg._count,
        weekRevenue: weekAgg._sum.totalPrice ?? 0,
      }}
      recentRides={recentRides.map((r) => ({
        id: r.id,
        status: r.status,
        name: r.dropoffName || r.dropoffAddress || 'Chuyến đi',
        totalPrice: r.totalPrice,
        updatedAt: r.updatedAt.toISOString(),
        rating: r.review?.rating ?? null,
      }))}
    />
  )
}
