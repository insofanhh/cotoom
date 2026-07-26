'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MapPin, Home, Utensils, Mountain, ChevronLeft } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const TABS = [
  { value: 'ALL', label: 'Tất cả', icon: MapPin },
  { value: 'ATTRACTION', label: 'Tham quan', icon: Mountain },
  { value: 'HOMESTAY', label: 'Homestay', icon: Home },
  { value: 'RESTAURANT', label: 'Ẩm thực', icon: Utensils },
]

const typeLabel: Record<string, string> = {
  ATTRACTION: 'Tham quan',
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
  images: string[]
  description: string
  priceRange?: string | null
  latitude: number
  longitude: number
}

interface DiscoveryClientProps {
  locations: Location[]
  initialQuery: string
  initialType: string
}

export function DiscoveryClient({
  locations,
  initialQuery,
  initialType,
}: DiscoveryClientProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState(
    TABS.find((t) => t.value === initialType) ? initialType : 'ALL'
  )

  const filtered = useMemo(() => {
    return locations.filter((loc) => {
      const matchesTab = activeTab === 'ALL' || loc.type === activeTab
      const matchesQuery =
        !query ||
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.description.toLowerCase().includes(query.toLowerCase())
      return matchesTab && matchesQuery
    })
  }, [locations, activeTab, query])

  return (
    <div className="pb-nav">
      {/* Header */}
      <div className="ocean-gradient px-4 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="text-white/80 hover:text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="font-outfit font-bold text-white text-xl">Khám phá Cô Tô</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="discovery-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm địa điểm..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow"
          />
        </div>

        <div className="h-5 bg-white absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.value}
                id={`discovery-tab-${tab.value.toLowerCase()}`}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border',
                  activeTab === tab.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                )}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pt-4">
        <p className="text-xs text-slate-400 mb-3">
          {filtered.length} địa điểm
        </p>

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((loc, i) => (
            <motion.div
              key={loc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/location/${loc.id}`}
                id={`discovery-location-${loc.id}`}
                className="block location-card"
              >
                {/* Image */}
                <div className="relative h-32 bg-slate-100">
                  {loc.images?.[0] ? (
                    <Image
                      src={loc.images[0]}
                      alt={loc.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 448px) 50vw, 224px"
                    />
                  ) : (
                    <div className="w-full h-full ocean-gradient-soft flex items-center justify-center">
                      <MapPin size={24} className="text-blue-300" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className={cn('text-[10px] px-1.5 py-0 border-0', typeBadgeClass[loc.type])}>
                      {typeLabel[loc.type]}
                    </Badge>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="font-semibold text-slate-800 text-xs leading-tight line-clamp-2">
                    {loc.name}
                  </p>
                  {loc.priceRange && (
                    <p className="text-blue-500 text-[10px] font-medium mt-1">{loc.priceRange}</p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <MapPin size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Không tìm thấy địa điểm nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
