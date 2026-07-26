import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { MobileShell } from '@/components/layout/MobileShell'
import { Clock, Car, Bike, Zap, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatVND, formatRelativeTime, formatRideStatus } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Lịch sử chuyến đi' }

const statusColors: Record<string, string> = {
  SEARCHING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const vehicleIcons: Record<string, any> = {
  MOTORBIKE: Bike,
  CAR: Car,
  ELECTRIC_CAR: Zap,
}

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const rides = await prisma.ride.findMany({
    where: { clientId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      driver: { select: { name: true } },
      review: true,
    },
    take: 30,
  })

  return (
    <MobileShell>
      <div className="pb-nav">
        {/* Header */}
        <div className="ocean-gradient px-4 pt-12 pb-8 relative">
          <div className="h-6 bg-white absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-cyan-200" />
            <h1 className="font-outfit font-bold text-white text-xl">Lịch sử chuyến</h1>
          </div>
          <p className="text-blue-100 text-sm mt-1">{rides.length} chuyến đi</p>
        </div>

        {/* Rides list */}
        <div className="px-4 pt-4 space-y-3">
          {rides.length === 0 ? (
            <div className="text-center py-16">
              <Clock size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Chưa có chuyến đi nào</p>
              <p className="text-slate-300 text-sm mt-1">Đặt xe ngay để khám phá Cô Tô!</p>
            </div>
          ) : (
            rides.map((ride) => {
              const Icon = vehicleIcons[ride.vehicleType] ?? Car
              const isActive = ride.status === 'ACCEPTED' || ride.status === 'IN_PROGRESS'
              const needsRating = ride.status === 'COMPLETED' && !ride.review
              const isClickable = isActive || needsRating
              
              const CardContent = (
                <div className={cn("bg-white rounded-2xl p-4 shadow-sm border border-slate-100", isActive && "ring-2 ring-blue-500 border-transparent", needsRating && "border-amber-200 bg-amber-50/30")}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Icon size={15} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{formatRelativeTime(ride.createdAt)}</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {ride.dropoffName ?? ride.dropoffAddress ?? 'Điểm đến'}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn('text-xs border-0', statusColors[ride.status])}>
                      {formatRideStatus(ride.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      {ride.distanceKm.toFixed(1)} km
                      {ride.driver && ` • ${ride.driver.name}`}
                    </div>
                    {needsRating ? (
                      <span className="text-xs font-bold text-amber-500 bg-amber-100 px-2 py-1 rounded-full">Đánh giá ngay</span>
                    ) : (
                      <p className="font-bold text-blue-600">{formatVND(ride.totalPrice)}</p>
                    )}
                  </div>
                </div>
              )

              return isClickable ? (
                <Link key={ride.id} href={`/ride/${ride.id}`} className="block transition-transform active:scale-[0.98]">
                  {CardContent}
                </Link>
              ) : (
                <div key={ride.id}>
                  {CardContent}
                </div>
              )
            })
          )}
        </div>
      </div>
    </MobileShell>
  )
}
