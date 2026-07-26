import Link from 'next/link'
import Image from 'next/image'
import { MapPin, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Location {
  id: string
  name: string
  type: string
  images: string[]
  latitude: number
  longitude: number
  priceRange?: string | null
  viewCount: number
}

interface FeaturedSpotsProps {
  spots: Location[]
}

export function FeaturedSpots({ spots }: FeaturedSpotsProps) {
  return (
    <section className="px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-500" />
          <h2 className="font-outfit font-bold text-slate-800 text-base">
            Địa điểm nổi bật
          </h2>
        </div>
        <Link
          href="/discovery"
          className="text-xs text-blue-500 font-medium hover:text-blue-700"
        >
          Xem tất cả →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
        {spots.map((spot, i) => (
          <Link
            key={spot.id}
            href={`/location/${spot.id}`}
            id={`featured-spot-${spot.id}`}
            className="flex-shrink-0 w-44 location-card cursor-pointer"
          >
            {/* Image */}
            <div className="relative h-28 bg-blue-100 overflow-hidden">
              {spot.images?.[0] ? (
                <Image
                  src={spot.images[0]}
                  alt={spot.name}
                  fill
                  className="object-cover"
                  sizes="176px"
                />
              ) : (
                <div className="w-full h-full ocean-gradient-soft flex items-center justify-center">
                  <MapPin size={24} className="text-blue-300" />
                </div>
              )}
              {/* Rank badge */}
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow">
                {i + 1}
              </div>
            </div>

            {/* Info */}
            <div className="p-2.5">
              <p className="font-semibold text-slate-800 text-xs leading-tight line-clamp-2">
                {spot.name}
              </p>
              {spot.priceRange && (
                <p className="text-[10px] text-blue-500 font-medium mt-1">
                  {spot.priceRange}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function FeaturedSpotsSkeleton() {
  return (
    <section className="px-4 py-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-44 rounded-2xl overflow-hidden">
            <Skeleton className="h-28 w-full" />
            <div className="p-2.5 space-y-1">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-2 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
