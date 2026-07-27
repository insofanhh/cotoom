'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  getGoongTileUrl,
  goongReverseGeocode,
  goongAutoComplete,
  goongPlaceDetail,
  goongGetDirection,
} from '@/lib/goong'

interface LeafletMapCoreProps {
  pickupLat?: number
  pickupLng?: number
  dropoffLat?: number
  dropoffLng?: number
  vehicleType?: string
  searchInputRef?: React.RefObject<HTMLDivElement | null>
  onLocationSelect?: (lat: number, lng: number, address: string, name: string) => void
  onRouteFound?: (distanceKm: number, durationMin: number) => void
  locations?: any[]
  clientLocation?: { lat: number; lng: number }
  drivers?: any[]
}

// Fix marker icons globally for Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom icons for locations
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

// Client Location Icon (Pulsing Dot)
const clientIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6"><div class="absolute w-full h-full bg-blue-500 rounded-full opacity-50 animate-ping"></div><div class="w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md z-10"></div></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function LeafletMapCore({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  vehicleType = 'MOTORBIKE',
  searchInputRef,
  onLocationSelect,
  onRouteFound,
  locations,
  clientLocation,
  drivers,
}: LeafletMapCoreProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const routePolylineRef = useRef<L.Polyline | null>(null)

  const onLocationSelectRef = useRef(onLocationSelect)
  const onRouteFoundRef = useRef(onRouteFound)

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
    onRouteFoundRef.current = onRouteFound
  }, [onLocationSelect, onRouteFound])

  // Init Map with Goong/Tile layer (Attribution hidden)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false, // Hide Leaflet & Goong attribution bar
      markerZoomAnimation: false,
    }).setView([20.9892, 107.7695], 14) // Co To center

    L.tileLayer(getGoongTileUrl(), {
      maxZoom: 20,
    }).addTo(map)

    mapInstance.current = map

    // Reverse Geocode on map click using Goong API
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      const result = await goongReverseGeocode(lat, lng)
      onLocationSelectRef.current?.(lat, lng, result.address, result.name)
    })

    return () => {
      try {
        if (routePolylineRef.current) {
          routePolylineRef.current.remove()
          routePolylineRef.current = null
        }
        map.stop()
        map.off()
        map.remove()
      } catch (e) {
        console.warn('Error during map cleanup', e)
      }
      mapInstance.current = null
    }
  }, [])

  // Update Markers & Goong Direction Route
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach((m) => {
      try {
        m.remove()
      } catch (e) {}
    })
    markersRef.current = []

    // Clear old polyline route
    if (routePolylineRef.current) {
      try {
        routePolylineRef.current.remove()
      } catch (e) {}
      routePolylineRef.current = null
    }

    // Render predefined locations
    if (locations && locations.length > 0 && !dropoffLat) {
      locations.forEach((loc) => {
        if (loc.latitude && loc.longitude) {
          const typeIcon = icons[loc.type] || icons.DEFAULT
          const m = L.marker([loc.latitude, loc.longitude], { icon: typeIcon, title: loc.name })
            .bindTooltip(loc.name, {
              permanent: true,
              direction: 'top',
              className:
                'bg-white border-0 shadow-sm text-xs font-bold text-slate-700 px-2 py-1 rounded-md mb-1',
              offset: [0, -25],
            })
            .addTo(map)

          m.on('click', () => {
            onLocationSelectRef.current?.(loc.latitude, loc.longitude, loc.name, loc.name)
          })
          markersRef.current.push(m)
        }
      })
    }

    // Render Client Location
    if (clientLocation) {
      const m = L.marker([clientLocation.lat, clientLocation.lng], {
        icon: clientIcon,
        zIndexOffset: 1000,
      }).addTo(map)
      markersRef.current.push(m)

      if (!pickupLat && !dropoffLat) {
        map.setView([clientLocation.lat, clientLocation.lng], 15)
      }
    }

    // Render Drivers
    if (drivers && drivers.length > 0) {
      drivers.forEach((d) => {
        if (d.latitude && d.longitude) {
          let lat = d.latitude
          let lng = d.longitude

          if (
            (pickupLat === lat && pickupLng === lng) ||
            (clientLocation && clientLocation.lat === lat && clientLocation.lng === lng)
          ) {
            lng += 0.00015
            lat += 0.00005
          }

          const dIcon = L.divIcon({
            html: `<div class="flex items-center justify-center w-8 h-8 bg-slate-800 rounded-full shadow-lg border-2 border-white text-white text-[14px]">${
              d.vehicleType === 'MOTORBIKE' ? '🏍️' : '🚘'
            }</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
          const m = L.marker([lat, lng], { icon: dIcon }).addTo(map)
          markersRef.current.push(m)
        }
      })
    }

    // Render Pickup Marker
    if (pickupLat && pickupLng) {
      const p = L.latLng(pickupLat, pickupLng)
      const m = L.marker(p, { title: 'Điểm đón' }).addTo(map)
      markersRef.current.push(m)
    }

    // Render Dropoff Marker
    if (dropoffLat && dropoffLng) {
      const p = L.latLng(dropoffLat, dropoffLng)
      const m = L.marker(p, { title: 'Điểm đến' }).addTo(map)
      markersRef.current.push(m)
    }

    // Calculate Route via Goong Direction API if both points exist
    if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
      let isMounted = true

      goongGetDirection(
        { lat: pickupLat, lng: pickupLng },
        { lat: dropoffLat, lng: dropoffLng },
        vehicleType
      ).then((routeRes) => {
        if (!isMounted || !mapInstance.current || !routeRes) return

        // Draw Polyline route on map
        const polyline = L.polyline(routeRes.coordinates, {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapInstance.current)

        routePolylineRef.current = polyline

        // Fit map bounds to show full route and both points with padding
        try {
          mapInstance.current.fitBounds(polyline.getBounds(), { padding: [70, 70], maxZoom: 16 })
        } catch (e) {}

        // Notify parent component of route distance & duration
        onRouteFoundRef.current?.(routeRes.distanceKm, routeRes.durationMin)
      })

      return () => {
        isMounted = false
      }
    } else if (dropoffLat && dropoffLng) {
      // Fit bounds to show BOTH client location (or pickup) AND selected destination in one frame
      const originLat = pickupLat ?? clientLocation?.lat
      const originLng = pickupLng ?? clientLocation?.lng

      if (originLat && originLng) {
        try {
          const bounds = L.latLngBounds([
            [originLat, originLng],
            [dropoffLat, dropoffLng],
          ])
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 })
        } catch (e) {}
      } else {
        map.setView([dropoffLat, dropoffLng], 15)
      }
    } else if (pickupLat && pickupLng && !dropoffLat && !clientLocation) {
      map.setView([pickupLat, pickupLng], 15)
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType, locations, clientLocation, drivers])

  // Custom Goong AutoComplete Search Box (Resilient to DOM unmount/remount)
  useEffect(() => {
    let cleanUpClickOutside: (() => void) | null = null

    const checkAndInit = () => {
      if (!searchInputRef?.current) return
      const container = searchInputRef.current

      // If search input is already created, skip
      if (container.querySelector('input.goong-search-input')) return

      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'Tìm kiếm địa điểm trên CoToom (Goong)...'
      input.className =
        'goong-search-input w-full h-full bg-transparent border-none outline-none px-4 py-2 text-sm text-slate-800 placeholder-slate-400'
      input.style.minHeight = '44px'

      const resultsDiv = document.createElement('div')
      resultsDiv.className =
        'absolute top-full left-0 w-full bg-white shadow-xl mt-1.5 rounded-xl overflow-hidden z-[1000] hidden flex-col max-h-[260px] overflow-y-auto border border-slate-100'

      container.innerHTML = ''
      container.style.position = 'relative'
      container.appendChild(input)
      container.appendChild(resultsDiv)

      let timeout: NodeJS.Timeout

      input.addEventListener('input', (e: any) => {
        const val = e.target.value
        clearTimeout(timeout)
        if (!val || val.trim().length === 0) {
          resultsDiv.classList.add('hidden')
          resultsDiv.classList.remove('flex')
          return
        }

        timeout = setTimeout(async () => {
          const predictions = await goongAutoComplete(val)
          if (predictions.length > 0) {
            resultsDiv.innerHTML = ''
            predictions.forEach((item: any) => {
              const div = document.createElement('div')
              div.className =
                'px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm text-slate-700 transition-colors'

              const mainText = item.structured_formatting?.main_text || item.description
              const secondaryText = item.structured_formatting?.secondary_text || ''

              div.innerHTML = `
                <p class="font-semibold text-slate-800 text-xs">${mainText}</p>
                ${secondaryText ? `<p class="text-[11px] text-slate-400 mt-0.5 truncate">${secondaryText}</p>` : ''}
              `

              div.onclick = async () => {
                resultsDiv.classList.add('hidden')
                resultsDiv.classList.remove('flex')
                input.value = mainText

                const detail = await goongPlaceDetail(item.place_id)
                if (detail) {
                  onLocationSelectRef.current?.(detail.lat, detail.lng, detail.address, detail.name)
                }
              }
              resultsDiv.appendChild(div)
            })
            resultsDiv.classList.remove('hidden')
            resultsDiv.classList.add('flex')
          } else {
            resultsDiv.classList.add('hidden')
            resultsDiv.classList.remove('flex')
          }
        }, 350)
      })

      const onClickOutside = (e: any) => {
        if (!container.contains(e.target)) {
          resultsDiv.classList.add('hidden')
          resultsDiv.classList.remove('flex')
        }
      }
      document.addEventListener('click', onClickOutside)
      cleanUpClickOutside = () => document.removeEventListener('click', onClickOutside)
    }

    checkAndInit()
    const timer = setInterval(checkAndInit, 200)

    return () => {
      clearInterval(timer)
      if (cleanUpClickOutside) cleanUpClickOutside()
    }
  }, [searchInputRef])

  return <div ref={mapRef} className="absolute inset-0 bg-slate-100 z-0" />
}
