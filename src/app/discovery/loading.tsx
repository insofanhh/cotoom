import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-svh bg-slate-100 flex justify-center">
      <main className="mobile-shell w-full bg-white pb-24">
        <div className="ocean-gradient px-4 pt-12 pb-10 relative">
          <div className="h-6 bg-white absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
          <Skeleton className="h-6 w-40 bg-white/40 mb-4" />
          <Skeleton className="h-11 w-full rounded-2xl bg-white/70" />
        </div>

        {/* Filter chips */}
        <div className="px-4 pt-4 flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>

        {/* Location cards */}
        <div className="px-4 pt-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-slate-100">
              <Skeleton className="h-36 w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
