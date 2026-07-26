import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-col h-screen max-h-[100dvh] bg-slate-50 relative overflow-hidden">
      {/* Map placeholder */}
      <div className="flex-1 bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Đang tải chuyến đi...</p>
        </div>
      </div>

      {/* Bottom card */}
      <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-5 space-y-4">
        <Skeleton className="w-12 h-1.5 rounded-full mx-auto" />
        <Skeleton className="h-6 w-44" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
