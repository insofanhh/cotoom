'use client'

import dynamic from 'next/dynamic'
import { AlertTriangle } from 'lucide-react'

// Dynamic import with no SSR to prevent window/document undefined errors from Leaflet in Next.js
const LeafletMapCore = dynamic(() => import('./LeafletMapCore'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center p-6 text-center z-10">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h3 className="text-slate-600 font-medium">Đang tải bản đồ...</h3>
    </div>
  )
})

interface MapComponentProps {
  pickupLat?: number
  pickupLng?: number
  dropoffLat?: number
  dropoffLng?: number
  searchInputRef?: React.RefObject<HTMLDivElement | null>
  onLocationSelect?: (lat: number, lng: number, address: string, name: string) => void
  locations?: any[]
  clientLocation?: { lat: number, lng: number }
  drivers?: any[]
}

export function MapComponent(props: MapComponentProps) {
  return <LeafletMapCore {...props} />
}
