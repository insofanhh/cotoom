'use client'

import { useState } from 'react'
import { Check, X, Clock, Bike, Car, Zap, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const statusMap = {
  PENDING_APPROVAL: { label: 'Chờ duyệt', class: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Đã duyệt', class: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Từ chối', class: 'bg-red-100 text-red-700' },
}

const vehicleIcons: Record<string, any> = { MOTORBIKE: Bike, CAR: Car, ELECTRIC_CAR: Zap }
const vehicleLabels: Record<string, string> = { MOTORBIKE: 'Xe máy', CAR: 'Ô tô', ELECTRIC_CAR: 'Xe điện' }

interface Driver {
  id: string
  status: string
  vehicleType: string
  vehiclePlate: string
  ratingAvg: number
  totalTrips: number
  isOnline: boolean
  user: { name: string; phone: string; createdAt: Date }
}

export function AdminDriversClient({ drivers }: { drivers: Driver[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const pending = drivers.filter((d) => d.status === 'PENDING_APPROVAL')
  const approved = drivers.filter((d) => d.status === 'APPROVED')
  const rejected = drivers.filter((d) => d.status === 'REJECTED')

  const handleAction = async (driverId: string, action: 'approve' | 'reject') => {
    setLoadingId(driverId)
    try {
      const res = await fetch('/api/admin/drivers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, action }),
      })
      if (!res.ok) throw new Error()
      toast.success(action === 'approve' ? 'Đã phê duyệt tài xế!' : 'Đã từ chối tài xế')
      router.refresh()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setLoadingId(null)
    }
  }

  const DriverRow = ({ driver }: { driver: Driver }) => {
    const Icon = vehicleIcons[driver.vehicleType] ?? Car
    return (
      <div className="flex items-center gap-4 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-blue-700 text-sm">{driver.user.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{driver.user.name}</p>
          <p className="text-slate-400 text-xs">{driver.user.phone}</p>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Icon size={14} />
          <span>{vehicleLabels[driver.vehicleType]}</span>
          <span className="text-slate-300">•</span>
          <span className="font-medium">{driver.vehiclePlate}</span>
        </div>
        <div className="flex items-center gap-1 text-amber-500 text-xs">
          <Star size={12} fill="currentColor" />
          <span>{driver.ratingAvg.toFixed(1)}</span>
        </div>
        <Badge className={cn('text-xs border-0', statusMap[driver.status as keyof typeof statusMap]?.class)}>
          {statusMap[driver.status as keyof typeof statusMap]?.label}
        </Badge>
        {driver.status === 'PENDING_APPROVAL' && (
          <div className="flex gap-2">
            <Button
              id={`approve-driver-${driver.id}`}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3"
              onClick={() => handleAction(driver.id, 'approve')}
              disabled={loadingId === driver.id}
            >
              <Check size={14} />
            </Button>
            <Button
              id={`reject-driver-${driver.id}`}
              size="sm"
              variant="outline"
              className="border-red-200 text-red-500 hover:bg-red-50 h-8 px-3"
              onClick={() => handleAction(driver.id, 'reject')}
              disabled={loadingId === driver.id}
            >
              <X size={14} />
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <Tabs defaultValue="pending">
        <div className="px-6 py-4 border-b border-slate-100">
          <TabsList className="bg-slate-50">
            <TabsTrigger id="admin-tab-pending" value="pending" className="gap-2">
              <Clock size={14} /> Chờ duyệt
              {pending.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger id="admin-tab-approved" value="approved">Đã duyệt ({approved.length})</TabsTrigger>
            <TabsTrigger id="admin-tab-rejected" value="rejected">Từ chối ({rejected.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="mt-0">
          {pending.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">Không có hồ sơ chờ duyệt</div>
          ) : (
            pending.map((d) => <DriverRow key={d.id} driver={d} />)
          )}
        </TabsContent>
        <TabsContent value="approved" className="mt-0">
          {approved.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">Chưa có tài xế được duyệt</div>
          ) : (
            approved.map((d) => <DriverRow key={d.id} driver={d} />)
          )}
        </TabsContent>
        <TabsContent value="rejected" className="mt-0">
          {rejected.map((d) => <DriverRow key={d.id} driver={d} />)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
