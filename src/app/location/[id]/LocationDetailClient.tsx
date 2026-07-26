'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  MapPin,
  Phone,
  MessageCircle,
  Car,
  Share2,
  Star,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useRideStore } from '@/store/rideStore'
import { cn } from '@/lib/utils'

const typeLabel: Record<string, string> = {
  ATTRACTION: 'Điểm tham quan',
  HOMESTAY: 'Homestay',
  RESTAURANT: 'Nhà hàng',
}

const typeBadgeClass: Record<string, string> = {
  ATTRACTION: 'bg-blue-100 text-blue-700',
  HOMESTAY: 'bg-orange-100 text-orange-700',
  RESTAURANT: 'bg-emerald-100 text-emerald-700',
}

interface Location {
  id: string
  name: string
  type: string
  description: string
  images: string[]
  latitude: number
  longitude: number
  priceRange?: string | null
  contactPhone?: string | null
}

interface Props {
  location: Location
  adminZaloPhone: string
}

export function LocationDetailClient({ location, adminZaloPhone }: Props) {
  const router = useRouter()
  const { setPrefilledDestination, setSelectedVehicleType } = useRideStore()
  const [activeImage, setActiveImage] = useState(0)

  const handleBookRide = () => {
    setPrefilledDestination({
      lat: location.latitude,
      lng: location.longitude,
      name: location.name,
      address: location.name,
    })
    setSelectedVehicleType('MOTORBIKE')
    router.push('/ride')
  }

  const handleZaloContact = () => {
    const phone = location.contactPhone || adminZaloPhone
    if (phone) {
      window.open(`https://zalo.me/${phone.replace(/\D/g, '')}`, '_blank')
    }
  }

  const images = location.images.length > 0 ? location.images : [null]

  return (
    <div className="min-h-svh bg-white flex flex-col">
      {/* Image gallery */}
      <div className="relative h-64 bg-slate-200 overflow-hidden flex-shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {images[activeImage] ? (
              <Image
                src={images[activeImage]!}
                alt={`${location.name} - ảnh ${activeImage + 1}`}
                fill
                className="object-cover"
                sizes="448px"
                priority
              />
            ) : (
              <div className="w-full h-full ocean-gradient flex items-center justify-center">
                <MapPin size={40} className="text-white/50" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

        {/* Back button */}
        <button
          id="location-detail-back"
          onClick={() => router.back()}
          className="absolute top-12 left-4 glass w-9 h-9 rounded-full flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        {/* Share */}
        <button
          id="location-detail-share"
          className="absolute top-12 right-4 glass w-9 h-9 rounded-full flex items-center justify-center"
          onClick={() => navigator.share?.({ title: location.name, url: window.location.href })}
        >
          <Share2 size={16} className="text-white" />
        </button>

        {/* Image dots */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === activeImage
                    ? 'w-4 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/50'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-4 pb-28">
        {/* Type badge */}
        <Badge
          className={cn(
            'text-xs mb-2 border-0',
            typeBadgeClass[location.type]
          )}
        >
          {typeLabel[location.type]}
        </Badge>

        {/* Name */}
        <h1 className="font-outfit font-bold text-slate-800 text-2xl leading-tight mb-2">
          {location.name}
        </h1>

        {/* Location coordinates */}
        <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-4">
          <MapPin size={14} className="text-blue-400 flex-shrink-0" />
          <span className="text-xs">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </span>
        </div>

        {/* Price */}
        {location.priceRange && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Giá tham khảo</span>
            <span className="text-sm text-blue-700 font-bold">{location.priceRange}</span>
          </div>
        )}

        {/* Description */}
        <div className="mb-5">
          <h2 className="font-semibold text-slate-800 text-sm mb-2">Giới thiệu</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{location.description}</p>
        </div>

        {/* Contact phone */}
        {location.contactPhone && (
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 mb-4">
            <Phone size={16} className="text-blue-500" />
            <div>
              <p className="text-xs text-slate-500">Liên hệ</p>
              <p className="text-sm font-semibold text-slate-800">{location.contactPhone}</p>
            </div>
          </div>
        )}

        {/* Map placeholder */}
        <div className="rounded-xl overflow-hidden border border-slate-100 bg-blue-50 h-36 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={24} className="text-blue-300 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Bản đồ vị trí</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 font-medium flex items-center justify-center gap-1 mt-1"
            >
              Mở Google Maps <ChevronRight size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Sticky bottom buttons */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-4 py-3 flex gap-3 shadow-lg z-40">
        <Button
          id="location-zalo-contact"
          variant="outline"
          className="flex-1 gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold"
          onClick={handleZaloContact}
        >
          <MessageCircle size={17} />
          Liên hệ Zalo
        </Button>
        <Button
          id="location-book-ride"
          className="flex-1 gap-2 ocean-gradient text-white font-semibold shadow-md hover:opacity-90"
          onClick={handleBookRide}
        >
          <Car size={17} />
          Đặt xe đến đây
        </Button>
      </div>
    </div>
  )
}
