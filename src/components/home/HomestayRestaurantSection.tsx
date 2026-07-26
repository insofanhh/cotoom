import Link from 'next/link'
import Image from 'next/image'
import { Phone, MapPin, Utensils, Home } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Location {
  id: string
  name: string
  type: string
  images: string[]
  description: string
  priceRange?: string | null
  contactPhone?: string | null
}

interface HomestayRestaurantSectionProps {
  title: string
  items: Location[]
  type: 'HOMESTAY' | 'RESTAURANT'
}

const typeConfig = {
  HOMESTAY: {
    icon: Home,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    badge: 'Homestay',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  RESTAURANT: {
    icon: Utensils,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    badge: 'Nhà hàng',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
}

export function HomestayRestaurantSection({
  title,
  items,
  type,
}: HomestayRestaurantSectionProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <section className="px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className={config.color} />
          <h2 className="font-outfit font-bold text-slate-800 text-base">{title}</h2>
        </div>
        <Link
          href={`/discovery?type=${type}`}
          className="text-xs text-blue-500 font-medium hover:text-blue-700"
        >
          Xem tất cả →
        </Link>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/location/${item.id}`}
            id={`location-card-${item.id}`}
            className="flex gap-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            {/* Image */}
            <div className="relative w-24 h-24 flex-shrink-0 bg-slate-100">
              {item.images?.[0] ? (
                <Image
                  src={item.images[0]}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className={cn('w-full h-full flex items-center justify-center', config.bg)}>
                  <Icon size={24} className={config.color} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 py-3 pr-3 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={cn('text-[10px] border px-1.5 py-0', config.badgeClass)}>
                    {config.badge}
                  </Badge>
                </div>
                <p className="font-semibold text-slate-800 text-sm leading-tight line-clamp-1">
                  {item.name}
                </p>
                <p className="text-slate-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-1">
                {item.priceRange && (
                  <p className="text-blue-600 text-xs font-semibold">{item.priceRange}</p>
                )}
                {item.contactPhone && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Phone size={10} />
                    <span className="text-[10px]">{item.contactPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function HomestayRestaurantSkeleton() {
  return (
    <section className="px-4 py-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-40 rounded" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 rounded-2xl overflow-hidden border border-slate-100">
            <Skeleton className="w-24 h-24 flex-shrink-0" />
            <div className="flex-1 py-3 pr-3 space-y-2">
              <Skeleton className="h-3 w-14 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
