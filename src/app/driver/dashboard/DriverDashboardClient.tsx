'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Waves, Power, Star, Car, TrendingUp, DollarSign, Route, Bell, ChevronLeft, AlertCircle, MapPin, Navigation, User, Phone, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { formatVND } from '@/lib/utils'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getPusherClient } from '@/lib/pusher'

interface DriverProfile {
  isOnline: boolean
  isBusy: boolean
  status: string
  vehicleType: string
  vehiclePlate: string
  ratingAvg: number
  totalTrips: number
  totalRevenue: number
}

interface Props {
  profile: DriverProfile
  userId: string
  userName: string
  initialActiveRide?: any
}

const vehicleLabels: Record<string, string> = {
  MOTORBIKE: 'Xe máy',
  CAR: 'Ô tô',
  ELECTRIC_CAR: 'Xe điện',
}

export function DriverDashboardClient({ profile, userId, userName, initialActiveRide }: Props) {
  const [localProfile, setLocalProfile] = useState(profile)
  const [isOnline, setIsOnline] = useState(profile.isOnline)
  const [toggling, setToggling] = useState(false)
  const [incomingRide, setIncomingRide] = useState<any>(null)
  const [activeRide, setActiveRide] = useState<any>(initialActiveRide || null)
  const router = useRouter()

  useEffect(() => {
    if (!isOnline) return

    const pusher = getPusherClient()
    const channelName = `private-driver-${userId}`
    const channel = pusher.subscribe(channelName)

    channel.bind('ride:new-request', (data: any) => {
      setIncomingRide(data)
      toast('Có chuyến xe mới!', {
        description: `Từ ${data.pickup} đến ${data.dropoff}`,
        icon: '🔔',
      })
    })

    return () => {
      channel.unbind('ride:new-request')
      pusher.unsubscribe(channelName)
    }
  }, [isOnline, userId])

  const acceptRide = async () => {
    if (!incomingRide) return
    setToggling(true)
    try {
      const res = await fetch(`/api/rides/${incomingRide.rideId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptToken: incomingRide.acceptToken }),
      })
      if (!res.ok) throw new Error('Không thể nhận chuyến')
      
      
      toast.success('Đã nhận chuyến thành công!')
      
      // Update active ride state directly from response or re-fetch
      setActiveRide({
        id: incomingRide.rideId,
        status: 'ACCEPTED',
        pickupAddress: incomingRide.pickup,
        dropoffAddress: incomingRide.dropoff,
        dropoffName: incomingRide.dropoff,
        totalPrice: incomingRide.price,
        client: { name: 'Khách hàng' } // We can fetch full client info later
      })
      setIncomingRide(null)
    } catch (err) {
      toast.error('Chuyến xe không còn khả dụng hoặc có lỗi xảy ra.')
      setIncomingRide(null)
    } finally {
      setToggling(false)
    }
  }

  const updateRideStatus = async (status: string) => {
    if (!activeRide) return
    setToggling(true)
    try {
      const res = await fetch(`/api/rides/${activeRide.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Lỗi cập nhật chuyến')
      
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        toast.success(status === 'COMPLETED' ? 'Đã hoàn thành chuyến xe!' : 'Đã hủy chuyến!')
        if (status === 'COMPLETED' && activeRide.totalPrice) {
          setLocalProfile(prev => ({
            ...prev,
            totalTrips: prev.totalTrips + 1,
            totalRevenue: prev.totalRevenue + activeRide.totalPrice
          }))
        }
        setActiveRide(null)
      } else {
        toast.success('Đã cập nhật trạng thái!')
        setActiveRide({ ...activeRide, status })
      }
    } catch {
      toast.error('Không thể cập nhật trạng thái')
    } finally {
      setToggling(false)
    }
  }

  const toggleOnline = async () => {
    setToggling(true)
    try {
      const res = await fetch('/api/driver/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !isOnline }),
      })
      if (!res.ok) throw new Error('Lỗi cập nhật trạng thái')
      setIsOnline(!isOnline)
      toast.success(isOnline ? 'Bạn đã offline' : 'Bạn đang online - sẵn sàng nhận chuyến!')
    } catch {
      toast.error('Không thể cập nhật trạng thái')
    } finally {
      setToggling(false)
    }
  }

  const isPending = localProfile.status === 'PENDING_APPROVAL'
  const isRejected = localProfile.status === 'REJECTED'

  return (
    <div className="min-h-svh bg-slate-50">
      {/* Header */}
      <div className={cn('px-4 pt-12 pb-8 relative', isOnline ? 'ocean-gradient' : 'bg-slate-400')}>
        <div className="h-6 bg-slate-50 absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Waves size={20} className="text-white/70" />
            <span className="text-white/80 text-xs font-medium">CoToom Driver</span>
          </div>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white text-xs" onClick={() => signOut({ callbackUrl: '/login' })}>
            Đăng xuất
          </Button>
        </div>
        <h1 className="font-outfit font-bold text-white text-xl">Xin chào, {userName}!</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-white/40')} />
          <span className="text-white/80 text-sm">{isOnline ? 'Đang online' : 'Offline'}</span>
          <span className="text-white/50 text-sm">•</span>
          <span className="text-white/70 text-sm">{vehicleLabels[localProfile.vehicleType]} — {localProfile.vehiclePlate}</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-10 space-y-4">
        {/* Pending notice */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Đang chờ phê duyệt</p>
              <p className="text-amber-600 text-xs mt-0.5">Hồ sơ của bạn đang được admin xem xét. Vui lòng chờ trong 24 giờ.</p>
            </div>
          </div>
        )}

        {/* Online toggle */}
        {!isPending && !isRejected && (
          <motion.button
            id="driver-online-toggle"
            whileTap={{ scale: 0.97 }}
            onClick={toggleOnline}
            disabled={toggling}
            className={cn(
              'w-full rounded-2xl p-5 flex items-center justify-between transition-all duration-300 shadow-sm',
              isOnline
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            )}
          >
            <div>
              <p className="font-outfit font-bold text-lg">{isOnline ? 'Đang hoạt động' : 'Không hoạt động'}</p>
              <p className={cn('text-sm mt-0.5', isOnline ? 'text-emerald-100' : 'text-slate-400')}>
                {isOnline ? 'Nhấn để offline' : 'Nhấn để nhận chuyến'}
              </p>
            </div>
            <div className={cn(
              'w-14 h-8 rounded-full relative transition-all duration-300',
              isOnline ? 'bg-white/30' : 'bg-slate-200'
            )}>
              <div className={cn(
                'absolute top-1 w-6 h-6 rounded-full shadow-md transition-all duration-300',
                isOnline ? 'left-7 bg-white' : 'left-1 bg-slate-400'
              )} />
            </div>
          </motion.button>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Đánh giá', value: localProfile.ratingAvg.toFixed(1), icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', suffix: '/ 5' },
            { label: 'Chuyến đi', value: localProfile.totalTrips.toString(), icon: Route, color: 'text-blue-500', bg: 'bg-blue-50', suffix: '' },
            { label: 'Doanh thu', value: formatVND(localProfile.totalRevenue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50', suffix: '' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-center">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', stat.bg)}>
                  <Icon size={16} className={stat.color} />
                </div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{stat.value}</p>
                {stat.suffix && <p className="text-slate-400 text-[10px]">{stat.suffix}</p>}
                <p className="text-slate-400 text-[10px] mt-0.5">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Active Ride UI */}
        {activeRide ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-blue-500 p-4 text-white">
              <h2 className="font-bold text-lg">Chuyến xe đang thực hiện</h2>
              <p className="text-blue-100 text-sm mt-0.5">
                {activeRide.status === 'ACCEPTED' ? 'Đang trên đường đón khách' : 'Đang chở khách đến nơi'}
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="text-slate-500" size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{activeRide.client?.name || 'Khách hàng'}</p>
                  <div className="flex items-center gap-1 text-slate-500 text-sm">
                    <Phone size={12} />
                    <span>{activeRide.client?.phone || 'Chưa cập nhật số ĐT'}</span>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-bold text-emerald-600 text-lg">{formatVND(activeRide.totalPrice)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-xs text-slate-500">Điểm đón</p>
                    <p className="font-medium text-sm text-slate-800 line-clamp-2">{activeRide.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="text-blue-500 mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-xs text-slate-500">Điểm đến</p>
                    <p className="font-medium text-sm text-slate-800 line-clamp-2">{activeRide.dropoffAddress || activeRide.dropoffName}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 grid gap-2">
                {activeRide.status === 'ACCEPTED' ? (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 font-bold"
                    onClick={() => updateRideStatus('IN_PROGRESS')}
                    disabled={toggling}
                  >
                    Đã đón được khách
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6 font-bold flex items-center gap-2"
                    onClick={() => updateRideStatus('COMPLETED')}
                    disabled={toggling}
                  >
                    <CheckCircle size={18} />
                    Hoàn thành chuyến
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  className="w-full text-slate-400 hover:text-red-500 rounded-xl"
                  onClick={() => {
                    if (confirm('Bạn có chắc chắn muốn hủy chuyến xe này?')) {
                      updateRideStatus('CANCELLED')
                    }
                  }}
                  disabled={toggling}
                >
                  Hủy chuyến
                </Button>
              </div>
            </div>
          </div>
        ) : incomingRide ? (
          <div className="bg-emerald-50 rounded-2xl p-4 shadow-sm border border-emerald-200 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <p className="font-bold text-emerald-800 text-base">Có chuyến xe mới!</p>
            </div>
            
            <div className="space-y-3 mb-4 bg-white rounded-xl p-3 border border-emerald-100">
              <div className="flex items-start gap-2">
                <MapPin className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                <div>
                  <p className="text-xs text-slate-500">Điểm đón</p>
                  <p className="font-medium text-sm text-slate-800 line-clamp-2">{incomingRide.pickup}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="text-blue-500 mt-0.5 shrink-0" size={16} />
                <div>
                  <p className="text-xs text-slate-500">Điểm đến</p>
                  <p className="font-medium text-sm text-slate-800 line-clamp-2">{incomingRide.dropoff}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">Thu nhập dự kiến</p>
                <p className="font-bold text-emerald-600 text-lg">{formatVND(incomingRide.price)}</p>
              </div>
            </div>

            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold py-6 shadow-md"
              onClick={acceptRide}
              disabled={toggling}
            >
              {toggling ? 'Đang nhận chuyến...' : 'Nhận chuyến ngay'}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={16} className="text-blue-500" />
              <p className="font-semibold text-slate-800 text-sm">Thông báo chuyến đi</p>
            </div>
            <div className="text-center py-6">
              <div className={cn('w-3 h-3 rounded-full mx-auto mb-3', isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-200')} />
              <p className="text-slate-400 text-sm">
                {isOnline ? 'Đang chờ chuyến mới...' : 'Bật online để nhận chuyến'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

