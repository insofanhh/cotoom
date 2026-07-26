import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-svh bg-slate-100 flex justify-center">
      <main className="mobile-shell w-full bg-white pb-24">
        <div className="ocean-gradient px-4 pt-12 pb-10 relative">
          <div className="h-6 bg-white absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
          <Skeleton className="h-6 w-44 bg-white/40" />
        </div>

        {/* Ride history rows */}
        <div className="px-4 pt-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
