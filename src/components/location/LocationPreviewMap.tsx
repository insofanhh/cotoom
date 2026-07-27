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

// Fix marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const icons: Record<string, L.Icon> = {
  ATTRACTION: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  HOMESTAY: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  RESTAURANT: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  DEFAULT: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
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

    const typeIcon = icons[type] || icons.DEFAULT
    L.marker([latitude, longitude], { icon: typeIcon, title: name })
      .bindTooltip(name, {
        permanent: true,
        direction: 'top',
        className: 'bg-white border-0 shadow-md text-xs font-bold text-slate-800 px-2.5 py-1 rounded-md mb-1',
        offset: [0, -25],
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
