'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getGoongTileUrl } from '@/lib/goong'
import { MapPin, ExternalLink } from 'lucide-react'

interface LocationPreviewMapProps {
  latitude: number
  longitude: number
  name: string
  type: string
}

// Custom category icons (Attraction = Camera/Landmark, Homestay = Hotel/Bed, Restaurant = Utensils)
const categoryConfigs: Record<string, { bgClass: string; svg: string }> = {
  ATTRACTION: {
    bgClass: 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-violet-300',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  },
  HOMESTAY: {
    bgClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-300',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
  },
  RESTAURANT: {
    bgClass: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-orange-300',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2-4 2v16"/><path d="M14 16.25V22"/><path d="M18 16.25V22"/><path d="M4 2v4a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2"/><path d="M7 9v13"/></svg>`,
  },
  DEFAULT: {
    bgClass: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-blue-300',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
}

function getCategoryLocationIcon(type: string) {
  const config = categoryConfigs[type] || categoryConfigs.DEFAULT
  return L.divIcon({
    className: 'custom-category-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full ${config.bgClass} border-2 border-white shadow-md flex items-center justify-center transition-transform hover:scale-110">
          ${config.svg}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function LocationPreviewMap({ latitude, longitude, name, type }: LocationPreviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([latitude, longitude], 15)

    L.tileLayer(getGoongTileUrl(), { maxZoom: 20 }).addTo(map)
    mapInstance.current = map

    const typeIcon = getCategoryLocationIcon(type)
    L.marker([latitude, longitude], { icon: typeIcon, title: name })
      .bindTooltip(name, {
        permanent: true,
        direction: 'top',
        className: 'bg-white border-0 shadow-md text-xs font-bold text-slate-800 px-2.5 py-1 rounded-md mb-1 pointer-events-none',
        offset: [0, -18],
      })
      .addTo(map)

    return () => {
      map.stop()
      map.off()
      map.remove()
      mapInstance.current = null
    }
  }, [latitude, longitude, name, type])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
          <MapPin size={16} className="text-blue-500" /> Vị trí trên bản đồ Cô Tô
        </h3>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
        >
          Google Maps <ExternalLink size={12} />
        </a>
      </div>

      <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0">
        <div ref={mapRef} className="absolute inset-0 z-0" />
      </div>
    </div>
  )
}
