'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Navigation, MapPin, User, Phone, ShieldCheck, CheckCircle } from 'lucide-react'
import { MapComponent } from '@/components/ride/MapComponent'
import { formatVND, formatRideStatus } from '@/lib/utils'
import { RideRating } from '@/components/ride/RideRating'
import { getPusherClient } from '@/lib/pusher'

interface RideTrackingClientProps {
  initialRide: any
}

export default function RideTrackingClient({ initialRide }: RideTrackingClientProps) {
  const router = useRouter()
  const [ride, setRide] = useState(initialRide)
  const [hasRated, setHasRated] = useState(!!initialRide.review)

  const refreshRide = useCallback(async () => {
    try {
      const res = await fetch(`/api/rides/${ride.id}`)
      if (res.ok) {
        const data = await res.json()
        setRide(data)
      }
    } catch (e) {
      console.error('Failed to fetch ride update', e)
    }
  }, [ride.id])

  useEffect(() => {
    // Only poll if ride is active
    if (!['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(ride.status)) return

    // Realtime updates via Pusher; polling below stays as fallback
    const pusher = getPusherClient()
    const channelName = `presence-ride-${ride.id}`
    const channel = pusher.subscribe(channelName)
    channel.bind('ride:driver-found', refreshRide)
    channel.bind('ride:status-update', refreshRide)

    // Live driver position — merge into local state, no refetch needed
    const onDriverLocation = (data: { latitude: number; longitude: number }) => {
      setRide((prev: any) =>
        prev.driver
          ? {
              ...prev,
              driver: {
                ...prev.driver,
                driverProfile: {
                  ...prev.driver.driverProfile,
                  latitude: data.latitude,
                  longitude: data.longitude,
                },
              },
            }
          : prev
      )
    }
    channel.bind('driver:location', onDriverLocation)

    const interval = setInterval(refreshRide, 30000)

    return () => {
      channel.unbind('ride:driver-found', refreshRide)
      channel.unbind('ride:status-update', refreshRide)
      channel.unbind('driver:location', onDriverLocation)
      pusher.unsubscribe(channelName)
      clearInterval(interval)
    }
  }, [ride.id, ride.status, refreshRide])

  // Determine route coordinates based on status
  // ACCEPTED: Driver to Pickup
  // IN_PROGRESS: Pickup to Dropoff
  // OTHER: Pickup to Dropoff (Historical)
  
  let routePickupLat: number | undefined
  let routePickupLng: number | undefined
  let routeDropoffLat: number | undefined
  let routeDropoffLng: number | undefined
  
  if (ride.status === 'ACCEPTED' && ride.driver?.driverProfile?.latitude && ride.driver?.driverProfile?.longitude) {
    // Driver -> Client
    routePickupLat = ride.driver.driverProfile.latitude
    routePickupLng = ride.driver.driverProfile.longitude
    routeDropoffLat = ride.pickupLat
    routeDropoffLng = ride.pickupLng
  } else {
    // Client -> Destination
    routePickupLat = ride.pickupLat
    routePickupLng = ride.pickupLng
    routeDropoffLat = ride.dropoffLat
    routeDropoffLng = ride.dropoffLng
  }

  // Format driver for MapComponent
  const drivers = ride.driver && ride.driver.driverProfile ? [{
    id: ride.driver.id,
    latitude: ride.driver.driverProfile.latitude,
    longitude: ride.driver.driverProfile.longitude,
    vehicleType: ride.vehicleType
  }] : []

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-4 bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 text-slate-700 active:scale-95 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-200">
        <MapComponent 
          pickupLat={routePickupLat}
          pickupLng={routePickupLng}
          dropoffLat={routeDropoffLat}
          dropoffLng={routeDropoffLng}
          drivers={['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(ride.status) ? drivers : []}
        />
      </div>

      {/* Info Card or Rating */}
      {ride.status === 'COMPLETED' && !hasRated ? (
        <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-md relative">
            <button
              onClick={() => router.back()}
              className="absolute -top-12 right-0 text-white font-medium"
            >
              Để sau
            </button>
            <RideRating 
              rideId={ride.id} 
              driverName={ride.driver?.name} 
              driverAvatar={ride.driver?.avatar}
              onSuccess={() => setHasRated(true)} 
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] relative z-20 pb-safe animate-in slide-in-from-bottom-full duration-300">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />
          
          <div className="px-5 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 font-outfit">
                  {ride.status === 'ACCEPTED' ? 'Tài xế đang đến' :
                   ride.status === 'ARRIVED' ? 'Tài xế đã đến điểm đón' :
                   ride.status === 'IN_PROGRESS' ? 'Đang trên đường' :
                   formatRideStatus(ride.status)}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {ride.distanceKm.toFixed(1)} km • {formatVND(ride.totalPrice)}
                </p>
              </div>
              
              {ride.status === 'ACCEPTED' && (
                <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-sm font-semibold animate-pulse flex items-center gap-1.5">
                  <ShieldCheck size={16} />
                  Đang di chuyển
                </div>
              )}
              {ride.status === 'COMPLETED' && (
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5">
                  <CheckCircle size={16} />
                  Đã hoàn thành
                </div>
              )}
            </div>

          {ride.driver && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <User className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">{ride.driver.name}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Phone size={12} />
                    <span>{ride.driver.phone}</span>
                  </div>
                  <span>•</span>
                  <span className="font-medium text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded text-xs">
                    {ride.driver.driverProfile?.vehiclePlate}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <div className="flex flex-col items-center mt-1">
                <MapPin className="text-emerald-500 shrink-0" size={18} />
                <div className="w-0.5 h-6 bg-slate-200 my-1" />
                <Navigation className="text-blue-500 shrink-0" size={18} />
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-8 flex items-center">
                  <p className="text-sm font-medium text-slate-700 line-clamp-1">{ride.pickupAddress}</p>
                </div>
                <div className="h-8 flex items-center border-t border-slate-100 pt-3">
                  <p className="text-sm font-medium text-slate-700 line-clamp-1">{ride.dropoffAddress || ride.dropoffName}</p>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
