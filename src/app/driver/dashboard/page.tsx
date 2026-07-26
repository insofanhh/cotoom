import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DriverDashboardClient } from './DriverDashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard Tài xế' }

export default async function DriverDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'DRIVER' && session.user.role !== 'ADMIN') redirect('/')

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.user.id },
  })

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
        status: { in: ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] }
      },
      include: { client: { select: { name: true, phone: true } } }
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

  return (
    <DriverDashboardClient
      profile={profile}
      userId={session.user.id}
      userName={session.user.name}
      initialActiveRide={activeRide}
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
