import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-svh bg-slate-50">
      <div className="ocean-gradient px-4 pt-12 pb-8 relative">
        <div className="h-6 bg-slate-50 absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
        <Skeleton className="h-3 w-28 bg-white/30 mb-3" />
        <Skeleton className="h-6 w-48 bg-white/40 mb-2" />
        <Skeleton className="h-3 w-40 bg-white/30" />
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Online toggle */}
        <Skeleton className="h-24 w-full rounded-2xl" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>

        {/* Ride notification area */}
        <Skeleton className="h-36 w-full rounded-2xl" />

        {/* Earnings */}
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  )
}
