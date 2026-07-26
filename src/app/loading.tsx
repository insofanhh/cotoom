import { Skeleton } from '@/components/ui/skeleton'
import { FeaturedSpotsSkeleton } from '@/components/home/FeaturedSpots'

// Instant skeleton for the home page while server data loads
export default function Loading() {
  return (
    <div className="min-h-svh bg-slate-100 flex justify-center">
      <main className="mobile-shell w-full bg-white pb-24">
        {/* Hero */}
        <div className="ocean-gradient px-4 pt-12 pb-14 relative">
          <div className="h-6 bg-white absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
          <Skeleton className="h-3 w-36 bg-white/30 mb-3" />
          <Skeleton className="h-7 w-52 bg-white/40 mb-2" />
          <Skeleton className="h-4 w-64 bg-white/30 mb-5" />
          <Skeleton className="h-12 w-full rounded-2xl bg-white/70" />
        </div>

        {/* Quick ride card */}
        <div className="px-4 pt-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Featured spots */}
        <FeaturedSpotsSkeleton />

        {/* Homestay / restaurant rows */}
        <div className="px-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-24 h-20 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
