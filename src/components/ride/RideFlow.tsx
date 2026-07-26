'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  MapPin,
  Navigation,
  Bike,
  Car,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer'
import { useRideStore } from '@/store/rideStore'
import { calculateDistance, formatVND } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getPusherClient } from '@/lib/pusher'
import { toast } from 'sonner'
import { MapComponent } from './MapComponent'
import { RideRating } from './RideRating'

const vehicleIcons = { MOTORBIKE: Bike, CAR: Car, ELECTRIC_CAR: Zap }
const vehicleLabels = { MOTORBIKE: 'Xe máy', CAR: 'Ô tô', ELECTRIC_CAR: 'Xe điện' }
const vehicleColors = {
  MOTORBIKE: 'bg-blue-500',
  CAR: 'bg-indigo-500',
  ELECTRIC_CAR: 'bg-emerald-500',
}

// Fallback rates — replaced by admin-configured settings fetched on mount
const DEFAULT_PRICE_PER_KM: Record<string, number> = {
  MOTORBIKE: 15000,
  CAR: 25000,
  ELECTRIC_CAR: 20000,
}

export function RideFlow() {
  const router = useRouter()
  const {
    flowState,
    setFlowState,
    booking,
    setBooking,
    activeRideId,
    setActiveRideId,
    driverInfo,
    setDriverInfo,
    selectedVehicleType,
    setSelectedVehicleType,
    prefilledDestination,
    setPrefilledDestination,
    setErrorMessage,
    errorMessage,
    reset,
  } = useRideStore()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPickup, setEditingPickup] = useState(false)
  const editingPickupRef = useRef(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [searchCountdown, setSearchCountdown] = useState(60)
  const [locations, setLocations] = useState<any[]>([])
  const [clientLocation, setClientLocation] = useState<{lat: number, lng: number} | null>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [hasRated, setHasRated] = useState(false)

  const searchInputRef = useRef<HTMLDivElement>(null)

  // Admin-configured price table (VND per km) — formula: rate x distance
  const pricePerKmRef = useRef<Record<string, number>>({ ...DEFAULT_PRICE_PER_KM })
  useEffect(() => {
    fetch('/api/settings/pricing')
      .then((res) => res.json())
      .then((data) => {
        if (data?.pricePerKm) pricePerKmRef.current = data.pricePerKm
      })
      .catch(() => {}) // defaults still apply
  }, [])

  // Fetch client location and nearby drivers on load
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
       navigator.geolocation.getCurrentPosition((pos) => {
         const lat = pos.coords.latitude
         const lng = pos.coords.longitude
         setClientLocation({ lat, lng })
         
         // Fetch drivers
         fetch(`/api/drivers/nearby?lat=${lat}&lng=${lng}`)
           .then(res => res.json())
           .then(data => setDrivers(data))
           .catch(err => console.error("Failed to fetch drivers", err))
       }, (err) => {
         console.warn("Could not get location", err)
       }, { timeout: 10000 })
    }
  }, [])

  // Fetch predefined locations
  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => setLocations(data))
      .catch(err => console.error(err))
  }, [])

  const handleLocationSelect = useCallback((lat: number, lng: number, address: string, name: string) => {
    // While adjusting the pickup point, a map tap moves the pickup — not the destination
    if (editingPickupRef.current) {
      const { booking: current } = useRideStore.getState()
      if (current) {
        setBooking({
          ...current,
          pickupLat: lat,
          pickupLng: lng,
          pickupAddress: address,
          durationMin: undefined, // route will recalculate for the new pickup
        })
      }
      editingPickupRef.current = false
      setEditingPickup(false)
      setDrawerOpen(true)
      return
    }
    setPrefilledDestination({ lat, lng, address, name })
  }, [setPrefilledDestination, setBooking])

  const startEditingPickup = useCallback(() => {
    editingPickupRef.current = true
    setEditingPickup(true)
    setDrawerOpen(false)
  }, [])

  const cancelEditingPickup = useCallback(() => {
    editingPickupRef.current = false
    setEditingPickup(false)
    setDrawerOpen(true)
  }, [])

  // OSRM routed distance is the real road distance — replace the straight-line
  // estimate with it while the user is still previewing (never after booking)
  const handleRouteFound = useCallback((distanceKm: number, durationMin: number) => {
    const { flowState: state, booking: current, selectedVehicleType: vehicle } = useRideStore.getState()
    if (state !== 'PREVIEW' || !current) return
    const price = distanceKm * pricePerKmRef.current[vehicle]
    setBooking({
      ...current,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      totalPrice: Math.round(price / 1000) * 1000,
      durationMin: Math.max(1, Math.round(durationMin)),
    })
  }, [setBooking])

  // When destination is prefilled, start locating immediately
  useEffect(() => {
    if (prefilledDestination && flowState === 'IDLE') {
      startLocating()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Search countdown + polling
  useEffect(() => {
    if (flowState !== 'SEARCHING') return
    const interval = setInterval(() => {
      setSearchCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          setFlowState('ERROR')
          setErrorMessage('Tất cả bác tài đang bận, xin vui lòng chờ!')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [flowState, setFlowState, setErrorMessage])

  // Listen to Pusher for driver acceptance when SEARCHING
  useEffect(() => {
    if ((flowState !== 'SEARCHING' && flowState !== 'DRIVER_FOUND' && flowState !== 'ARRIVED' && flowState !== 'IN_PROGRESS') || !activeRideId) return

    const pusher = getPusherClient()
    const channelName = `presence-ride-${activeRideId}`
    const channel = pusher.subscribe(channelName)

    channel.bind('ride:driver-found', (data: any) => {
      setDriverInfo({
        id: data.driver.id,
        name: data.driver.name,
        phone: data.driver.phone,
        plate: data.driver.vehiclePlate ?? '',
        vehicleType: data.vehicleType,
        rating: data.driver.rating ?? 5,
        avatar: data.driver.avatar,
        latitude: data.driver.latitude,
        longitude: data.driver.longitude,
      })
      setFlowState('DRIVER_FOUND')
    })
    
    channel.bind('driver:location', (data: { latitude: number; longitude: number }) => {
      const { driverInfo: current } = useRideStore.getState()
      if (current) {
        setDriverInfo({ ...current, latitude: data.latitude, longitude: data.longitude })
      }
    })

    channel.bind('ride:status-update', (data: any) => {
      if (data.status === 'ARRIVED') setFlowState('ARRIVED')
      if (data.status === 'IN_PROGRESS') setFlowState('IN_PROGRESS')
      if (data.status === 'COMPLETED') setFlowState('COMPLETED')
      if (data.status === 'CANCELLED') {
        setFlowState('ERROR')
        setErrorMessage('Tài xế đã hủy chuyến hoặc có sự cố xảy ra.')
      }
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [flowState, activeRideId, setDriverInfo, setFlowState, setErrorMessage])

  const startLocating = useCallback(async () => {
    setFlowState('LOCATING')
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Trình duyệt không hỗ trợ định vị')
      setFlowState('IDLE')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords

        if (!prefilledDestination) {
          setLocationError('Chưa chọn điểm đến')
          setFlowState('IDLE')
          return
        }

        const dist = calculateDistance(
          latitude,
          longitude,
          prefilledDestination.lat,
          prefilledDestination.lng
        )
        const price = dist * pricePerKmRef.current[selectedVehicleType]

        setBooking({
          pickupLat: latitude,
          pickupLng: longitude,
          pickupAddress: 'Vị trí hiện tại của bạn',
          dropoffLat: prefilledDestination.lat,
          dropoffLng: prefilledDestination.lng,
          dropoffAddress: prefilledDestination.address,
          dropoffName: prefilledDestination.name,
          distanceKm: parseFloat(dist.toFixed(2)),
          totalPrice: Math.round(price / 1000) * 1000,
          vehicleType: selectedVehicleType,
        })

        setFlowState('PREVIEW')
        setDrawerOpen(true)
      },
      (err) => {
        setLocationError('Không thể lấy vị trí. Vui lòng bật định vị.')
        setFlowState('IDLE')
        toast.error('Không thể lấy vị trí của bạn')
      },
      { timeout: 10000, maximumAge: 30000 }
    )
  }, [prefilledDestination, selectedVehicleType, setBooking, setFlowState])

  const confirmRide = async () => {
    if (!booking) return
    setDrawerOpen(false)
    setFlowState('SEARCHING')
    setSearchCountdown(60)

    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Lỗi tạo chuyến')
      }

      const ride = await res.json()
      setActiveRideId(ride.id)
    } catch (err: any) {
      setFlowState('ERROR')
      setErrorMessage(err.message ?? 'Có lỗi xảy ra, vui lòng thử lại')
    }
  }

  const VehicleIcon = vehicleIcons[selectedVehicleType]

  return (
    <div className="min-h-svh flex flex-col">
      {/* Header */}
      <div className="ocean-gradient px-4 pt-12 pb-6 relative">
        <div className="h-6 bg-slate-50 absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
        <div className="flex items-center gap-3 mb-3">
          <button
            id="ride-back"
            onClick={() => { reset(); router.back() }}
            className="text-white/80 hover:text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-outfit font-bold text-white text-xl">Đặt xe</h1>
        </div>

        {/* Vehicle selector */}
        <div className="flex gap-2">
          {(['MOTORBIKE', 'CAR', 'ELECTRIC_CAR'] as const).map((type) => {
            const Icon = vehicleIcons[type]
            return (
              <button
                key={type}
                id={`vehicle-type-${type.toLowerCase()}`}
                onClick={() => setSelectedVehicleType(type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200',
                  selectedVehicleType === type
                    ? 'bg-white text-blue-700 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <Icon size={13} />
                {vehicleLabels[type]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative">
        <MapComponent 
          pickupLat={booking?.pickupLat}
          pickupLng={booking?.pickupLng}
          dropoffLat={booking?.dropoffLat ?? prefilledDestination?.lat}
          dropoffLng={booking?.dropoffLng ?? prefilledDestination?.lng}
          searchInputRef={searchInputRef}
          onLocationSelect={handleLocationSelect}
          onRouteFound={handleRouteFound}
          locations={locations}
          clientLocation={clientLocation ?? undefined}
          drivers={driverInfo && driverInfo.latitude && driverInfo.longitude ? [{
            id: driverInfo.id,
            latitude: driverInfo.latitude,
            longitude: driverInfo.longitude,
            vehicleType: driverInfo.vehicleType
          }] : drivers}
        />

        {/* Pickup adjustment hint */}
        {editingPickup && (
          <div className="absolute bottom-6 left-4 right-4 bg-white rounded-2xl p-4 shadow-xl border border-blue-100 z-[500]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-blue-600" />
              </div>
              <p className="text-sm font-medium text-slate-700 flex-1">
                Chạm vào bản đồ để ghim lại điểm đón của bạn
              </p>
              <Button variant="outline" size="sm" onClick={cancelEditingPickup}>
                Hủy
              </Button>
            </div>
          </div>
        )}

        {/* State overlays */}
        <AnimatePresence>
          {/* IDLE state */}
          {flowState === 'IDLE' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-6 left-4 right-4 bg-white rounded-2xl p-5 shadow-xl"
            >
              {!prefilledDestination ? (
                <div className="py-2">
                  <p className="font-semibold text-slate-700 mb-3 text-center">Bạn muốn đi đâu?</p>
                  <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-slate-400" />
                    </div>
                    <div 
                      ref={searchInputRef}
                      className="w-full bg-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all flex items-center min-h-[44px]"
                    >
                      <span className="text-slate-400">Đang tải tìm kiếm...</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    <p>Hoặc chạm vào bản đồ để ghim điểm đến</p>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Điểm đến</p>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MapPin size={14} className="text-blue-600" />
                    </div>
                    <p className="font-semibold text-slate-800">{prefilledDestination.name}</p>
                  </div>
                  {locationError && (
                    <p className="text-red-500 text-xs mb-3 flex items-center gap-1">
                      <AlertTriangle size={13} /> {locationError}
                    </p>
                  )}
                  <Button
                    id="ride-start-locating"
                    className="w-full ocean-gradient text-white font-semibold"
                    onClick={startLocating}
                  >
                    <Navigation size={16} className="mr-2" />
                    Lấy vị trí & Xem giá
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* LOCATING */}
          {flowState === 'LOCATING' && (
            <motion.div
              key="locating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="text-center">
                <Loader2 size={40} className="text-blue-500 animate-spin mx-auto mb-3" />
                <p className="font-semibold text-slate-700">Đang lấy vị trí của bạn...</p>
                <p className="text-sm text-slate-400 mt-1">Vui lòng cho phép truy cập định vị</p>
              </div>
            </motion.div>
          )}

          {/* SEARCHING */}
          {flowState === 'SEARCHING' && (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="text-center px-8">
                {/* Animated bars */}
                <div className="flex items-end justify-center gap-1.5 h-12 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2.5 rounded-full bg-blue-500 animate-wave"
                      style={{
                        animationDelay: `${i * 0.15}s`,
                        height: '100%',
                      }}
                    />
                  ))}
                </div>
                <p className="font-outfit font-bold text-slate-800 text-lg mb-1">
                  Đang tìm tài xế...
                </p>
                <p className="text-slate-500 text-sm mb-3">
                  Đang kết nối với tài xế gần nhất
                </p>
                <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-blue-600 text-sm font-medium">
                    {searchCountdown}s
                  </span>
                </div>
                <div className="mt-5">
                  <Button
                    id="ride-cancel"
                    variant="ghost"
                    className="text-slate-400 text-sm"
                    onClick={() => {
                      reset()
                      router.push('/')
                    }}
                  >
                    Hủy chuyến
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* DRIVER_FOUND */}
          {flowState === 'DRIVER_FOUND' && driverInfo && (
            <motion.div
              key="driver-found"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <p className="font-outfit font-bold text-slate-800">Tài xế đang đến!</p>
              </div>

              <div className="flex items-center gap-4 bg-blue-50 rounded-2xl p-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center text-2xl flex-shrink-0">
                  {driverInfo.avatar ? (
                    <img src={driverInfo.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '🧑‍✈️'
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{driverInfo.name}</p>
                  <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                    <Star size={12} fill="currentColor" />
                    <span className="text-sm font-medium">{driverInfo.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn('rounded-lg px-3 py-1.5', vehicleColors[driverInfo.vehicleType])}>
                    <p className="text-white text-xs font-bold">{driverInfo.plate}</p>
                    <p className="text-white/80 text-[10px]">{vehicleLabels[driverInfo.vehicleType]}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ARRIVED — driver is waiting at the pickup point */}
          {flowState === 'ARRIVED' && driverInfo && (
            <motion.div
              key="arrived"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-cyan-500" />
                <p className="font-outfit font-bold text-slate-800">Tài xế đã đến điểm đón!</p>
              </div>
              <div className="flex items-center gap-4 bg-cyan-50 rounded-2xl p-4 mb-2">
                <div className="w-12 h-12 rounded-full bg-cyan-200 flex items-center justify-center text-2xl flex-shrink-0">
                  🧑‍✈️
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{driverInfo.name}</p>
                  <p className="text-slate-500 text-sm">{driverInfo.plate} • {vehicleLabels[driverInfo.vehicleType]}</p>
                </div>
                <a
                  href={`tel:${driverInfo.phone}`}
                  className="w-11 h-11 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow"
                >
                  📞
                </a>
              </div>
              <p className="text-slate-500 text-sm text-center">Vui lòng ra điểm đón, tài xế đang chờ bạn.</p>
            </motion.div>
          )}

          {/* IN_PROGRESS */}
          {flowState === 'IN_PROGRESS' && driverInfo && (
            <motion.div
              key="in-progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5"
            >
              <p className="font-outfit font-bold text-slate-800 mb-2">🚀 Đang trên đường...</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  🧑‍✈️
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{driverInfo.name}</p>
                  <p className="text-slate-500 text-xs">{driverInfo.plate}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* COMPLETED */}
          {flowState === 'COMPLETED' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-white/95 flex items-center justify-center overflow-y-auto"
            >
              <div className="w-full max-w-md px-4 py-8">
                {!hasRated && activeRideId ? (
                  <RideRating 
                    rideId={activeRideId} 
                    driverName={driverInfo?.name} 
                    driverAvatar={driverInfo?.avatar}
                    onSuccess={() => setHasRated(true)} 
                  />
                ) : (
                  <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-in zoom-in-95">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="font-outfit font-bold text-2xl text-slate-800 mb-2">
                      Hoàn thành! 🎉
                    </h2>
                    <p className="text-slate-500 text-sm mb-2">
                      Cảm ơn bạn đã đồng hành cùng CoToom!
                    </p>
                    {booking && (
                      <p className="font-bold text-blue-600 text-lg mb-6">
                        {formatVND(booking.totalPrice)}
                      </p>
                    )}
                    <Button
                      id="ride-done"
                      className="w-full ocean-gradient text-white font-semibold"
                      onClick={() => { reset(); router.push('/') }}
                    >
                      Về trang chủ
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ERROR */}
          {flowState === 'ERROR' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-6 left-4 right-4 bg-white rounded-2xl p-5 shadow-xl border border-red-100"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Không tìm được tài xế</p>
                  <p className="text-slate-500 text-sm">{errorMessage}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  id="ride-retry"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setFlowState('SEARCHING')
                    setSearchCountdown(60)
                    confirmRide()
                  }}
                >
                  Thử lại
                </Button>
                <Button
                  id="ride-cancel-error"
                  className="flex-1 ocean-gradient text-white"
                  onClick={() => { reset(); router.push('/') }}
                >
                  Về trang chủ
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Price Preview Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto">
          <DrawerHeader>
            <DrawerTitle className="font-outfit">Xác nhận chuyến đi</DrawerTitle>
          </DrawerHeader>

          {booking && (
            <div className="px-4 pb-4 space-y-4">
              {/* Route info */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">Điểm đón</p>
                    <p className="text-sm font-medium text-slate-700 line-clamp-2">{booking.pickupAddress}</p>
                  </div>
                  <button
                    id="ride-edit-pickup"
                    type="button"
                    onClick={startEditingPickup}
                    className="text-blue-500 text-xs font-semibold flex-shrink-0 bg-blue-50 rounded-lg px-2.5 py-1.5 active:scale-95"
                  >
                    Sửa
                  </button>
                </div>
                <div className="ml-1.5 w-px h-4 bg-slate-200" />
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Điểm đến</p>
                    <p className="text-sm font-medium text-slate-700">{booking.dropoffName}</p>
                  </div>
                </div>
              </div>

              {/* Note for the driver */}
              <textarea
                id="ride-note"
                value={booking.note ?? ''}
                onChange={(e) => setBooking({ ...booking, note: e.target.value })}
                placeholder="Ghi chú cho tài xế (VD: đứng trước cổng chợ, gọi khi đến...)"
                rows={2}
                maxLength={300}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-blue-400"
              />

              {/* Price breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Khoảng cách</span>
                  <span className="font-medium">
                    {booking.distanceKm.toFixed(1)} km
                    {!booking.durationMin && (
                      <span className="text-slate-400 font-normal"> (ước tính)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Thời gian dự kiến</span>
                  <span className="font-medium">
                    {booking.durationMin
                      ? `~${booking.durationMin} phút`
                      : 'Đang tính lộ trình...'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Phương tiện</span>
                  <span className="font-medium">{vehicleLabels[booking.vehicleType]}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-800">Tổng tiền</span>
                  <span className="font-bold text-blue-600 text-lg">{formatVND(booking.totalPrice)}</span>
                </div>
                <p className="text-xs text-slate-400">*Giá có thể thay đổi theo tình trạng thực tế</p>
              </div>
            </div>
          )}

          <DrawerFooter className="flex gap-3 px-4 pb-6">
            <Button
              id="ride-confirm"
              className="flex-1 ocean-gradient text-white font-semibold py-3 text-base"
              onClick={confirmRide}
            >
              Xác nhận đặt xe
            </Button>
            <Button
              id="ride-drawer-cancel"
              variant="outline"
              className="flex-1"
              onClick={() => { setDrawerOpen(false); setFlowState('IDLE') }}
            >
              Hủy
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
