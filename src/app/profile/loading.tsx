import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-svh bg-slate-100 flex justify-center">
      <main className="mobile-shell w-full bg-white pb-24">
        <div className="ocean-gradient px-4 pt-12 pb-16 relative">
          <div className="h-12 bg-white absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 30px 30px 0 0' }} />
          <Skeleton className="h-6 w-28 bg-white/40" />
        </div>

        {/* Avatar card */}
        <div className="px-4 -mt-8 relative z-10 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 text-center">
            <Skeleton className="w-20 h-20 rounded-full mx-auto mb-3" />
            <Skeleton className="h-5 w-32 mx-auto mb-2" />
            <Skeleton className="h-3 w-24 mx-auto mb-2" />
            <Skeleton className="h-6 w-20 rounded-full mx-auto" />
          </div>
        </div>

        {/* Menu rows */}
        <div className="px-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  )
}
