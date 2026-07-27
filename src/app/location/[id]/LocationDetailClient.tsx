'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  MessageCircle,
  Car,
  Share2,
  X,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useRideStore } from '@/store/rideStore'
import { cn } from '@/lib/utils'

const typeLabel: Record<string, string> = {
  ATTRACTION: 'Điểm tham quan',
  HOMESTAY: 'Homestay / Khách sạn',
  RESTAURANT: 'Nhà hàng / Quán ăn',
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
  const [showLightbox, setShowLightbox] = useState(false)

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

  const images = location.images && location.images.length > 0 ? location.images : [null]

  const nextImage = () => {
    setActiveImage((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setActiveImage((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="min-h-svh bg-white flex flex-col">
      {/* Image gallery slider */}
      <div className="relative h-72 bg-slate-900 overflow-hidden flex-shrink-0 group">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 cursor-pointer"
            onClick={() => images[activeImage] && setShowLightbox(true)}
          >
            {images[activeImage] ? (
              <Image
                src={images[activeImage]!}
                alt={`${location.name} - ảnh ${activeImage + 1}`}
                fill
                className="object-cover"
                sizes="448px"
                priority
                unoptimized={images[activeImage]!.startsWith('/uploads/')}
              />
            ) : (
              <div className="w-full h-full ocean-gradient flex items-center justify-center">
                <MapPin size={48} className="text-white/50" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Back button */}
        <button
          id="location-detail-back"
          onClick={() => router.back()}
          className="absolute top-12 left-4 glass w-9 h-9 rounded-full flex items-center justify-center z-10 shadow-md"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        {/* Share */}
        <button
          id="location-detail-share"
          className="absolute top-12 right-4 glass w-9 h-9 rounded-full flex items-center justify-center z-10 shadow-md"
          onClick={() => navigator.share?.({ title: location.name, url: window.location.href })}
        >
          <Share2 size={16} className="text-white" />
        </button>

        {/* Image Counter & Fullscreen hint */}
        {images.length > 0 && images[0] && (
          <button
            onClick={() => setShowLightbox(true)}
            className="absolute top-12 right-16 glass px-2.5 py-1 rounded-full text-[11px] text-white flex items-center gap-1 z-10 font-medium"
          >
            <Maximize2 size={11} /> {activeImage + 1}/{images.length}
          </button>
        )}

        {/* Previous / Next Arrow Controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all z-10"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all z-10"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Slide Indicator Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === activeImage ? 'w-5 h-1.5 bg-white shadow-sm' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-4 pb-28">
        {/* Type badge */}
        <Badge className={cn('text-xs mb-2 border-0 font-medium', typeBadgeClass[location.type] || 'bg-slate-100 text-slate-700')}>
          {typeLabel[location.type] || location.type}
        </Badge>

        {/* Name */}
        <h1 className="font-outfit font-bold text-slate-800 text-2xl leading-tight mb-2">
          {location.name}
        </h1>

        {/* Location coordinates */}
        <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-4">
          <MapPin size={14} className="text-blue-500 flex-shrink-0" />
          <span className="text-xs font-mono">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </span>
        </div>

        {/* Price */}
        {location.priceRange && (
          <div className="bg-blue-50/80 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between shadow-xs">
            <span className="text-xs text-slate-600 font-medium">Giá tham khảo</span>
            <span className="text-sm text-blue-700 font-bold">{location.priceRange}</span>
          </div>
        )}

        {/* Description */}
        <div className="mb-5">
          <h2 className="font-semibold text-slate-800 text-sm mb-2">Giới thiệu</h2>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{location.description}</p>
        </div>

        {/* Contact phone */}
        {location.contactPhone && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-4">
            <Phone size={16} className="text-blue-500" />
            <div>
              <p className="text-xs text-slate-500">Liên hệ</p>
              <p className="text-sm font-semibold text-slate-800">{location.contactPhone}</p>
            </div>
          </div>
        )}

        {/* Map link placeholder */}
        <div className="rounded-xl overflow-hidden border border-slate-200/70 bg-slate-50 h-32 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={24} className="text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500 font-medium">Vị trí địa điểm trên Cô Tô</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 font-semibold flex items-center justify-center gap-1 mt-1 hover:underline"
            >
              Mở trên Google Maps <ChevronRight size={12} />
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

      {/* Fullscreen Lightbox Modal */}
      {showLightbox && images[activeImage] && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-white pt-8 px-2">
            <span className="text-xs font-mono">
              {activeImage + 1} / {images.length} - {location.name}
            </span>
            <button onClick={() => setShowLightbox(false)} className="p-2 rounded-full bg-white/20 text-white">
              <X size={20} />
            </button>
          </div>

          <div className="relative flex-1 w-full flex items-center justify-center">
            <Image
              src={images[activeImage]!}
              alt={`${location.name} full`}
              fill
              className="object-contain"
              unoptimized={images[activeImage]!.startsWith('/uploads/')}
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 bg-white/20 text-white p-3 rounded-full hover:bg-white/40 z-10"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 bg-white/20 text-white p-3 rounded-full hover:bg-white/40 z-10"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          <div className="flex justify-center gap-1.5 pb-6">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  'rounded-full transition-all',
                  i === activeImage ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
