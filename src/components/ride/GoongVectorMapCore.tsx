'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getGoongVectorStyleUrl } from '@/lib/goongVector'
import {
  goongReverseGeocode,
  goongAutoComplete,
  goongPlaceDetail,
  goongGetDirection,
} from '@/lib/goong'

interface GoongVectorMapCoreProps {
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

export default function GoongVectorMapCore({
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
}: GoongVectorMapCoreProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  const onLocationSelectRef = useRef(onLocationSelect)
  const onRouteFoundRef = useRef(onRouteFound)

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
    onRouteFoundRef.current = onRouteFound
  }, [onLocationSelect, onRouteFound])

  // Init MapLibre GL JS Vector Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: getGoongVectorStyleUrl(),
      center: [107.7695, 20.9892], // Co To center [lng, lat]
      zoom: 14,
      pitch: 30, // 3D tilt
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    mapInstance.current = map

    // Reverse Geocode on map click using Goong API
    map.on('click', async (e: maplibregl.MapMouseEvent) => {
      const { lat, lng } = e.lngLat
      const result = await goongReverseGeocode(lat, lng)
      onLocationSelectRef.current?.(lat, lng, result.address, result.name)
    })

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // Update Markers & Goong Direction Polyline Route
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach((m: maplibregl.Marker) => {
      try {
        m.remove()
      } catch (e) {}
    })
    markersRef.current = []

    // Render predefined locations
    if (locations && locations.length > 0 && !dropoffLat) {
      locations.forEach((loc) => {
        if (loc.latitude && loc.longitude) {
          const el = document.createElement('div')
          el.className = 'relative flex flex-col items-center cursor-pointer group z-10'
          
          const iconEmoji = loc.type === 'ATTRACTION' ? '🏝️' : loc.type === 'HOMESTAY' ? '🏡' : '🍽️'
          el.innerHTML = `
            <div class="bg-white text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md border border-slate-100 mb-1 whitespace-nowrap">
              ${loc.name}
            </div>
            <div class="w-7 h-7 rounded-full bg-slate-800 border-2 border-white shadow-lg flex items-center justify-center text-xs">
              ${iconEmoji}
            </div>
          `

          el.onclick = () => {
            onLocationSelectRef.current?.(loc.latitude, loc.longitude, loc.name, loc.name)
          }

          const m = new maplibregl.Marker({ element: el })
            .setLngLat([loc.longitude, loc.latitude])
            .addTo(map)

          markersRef.current.push(m)
        }
      })
    }

    // Render Client Location (Pulsing Dot)
    if (clientLocation) {
      const el = document.createElement('div')
      el.className = 'relative flex items-center justify-center w-6 h-6'
      el.innerHTML = `
        <div class="absolute w-full h-full bg-blue-500 rounded-full opacity-50 animate-ping"></div>
        <div class="w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md z-10"></div>
      `
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([clientLocation.lng, clientLocation.lat])
        .addTo(map)

      markersRef.current.push(m)

      if (!pickupLat && !dropoffLat) {
        map.flyTo({ center: [clientLocation.lng, clientLocation.lat], zoom: 15 })
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

          const el = document.createElement('div')
          el.className = 'w-8 h-8 bg-slate-800 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white text-[14px]'
          el.innerHTML = d.vehicleType === 'MOTORBIKE' ? '🏍️' : '⚡'

          const m = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map)

          markersRef.current.push(m)
        }
      })
    }

    // Render Pickup Marker
    if (pickupLat && pickupLng) {
      const el = document.createElement('div')
      el.className = 'w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold'
      el.innerText = 'Đón'

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([pickupLng, pickupLat])
        .addTo(map)

      markersRef.current.push(m)
    }

    // Render Dropoff Marker
    if (dropoffLat && dropoffLng) {
      const el = document.createElement('div')
      el.className = 'w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold'
      el.innerText = 'Đến'

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([dropoffLng, dropoffLat])
        .addTo(map)

      markersRef.current.push(m)
    }

    // Helper to safely remove route layer and source
    const removeRoute = () => {
      if (map.getLayer('route-line')) map.removeLayer('route-line')
      if (map.getSource('route')) map.removeSource('route')
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

        removeRoute()

        // GeoJSON line coordinates [lng, lat]
        const lineCoords = routeRes.coordinates.map(([lLat, lLng]) => [lLng, lLat])

        mapInstance.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: lineCoords,
            },
          },
        })

        mapInstance.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 6,
            'line-opacity': 0.85,
          },
        })

        // Fit map bounds to show route
        try {
          const bounds = lineCoords.reduce(
            (b, coord) => b.extend(coord as [number, number]),
            new maplibregl.LngLatBounds(lineCoords[0] as [number, number], lineCoords[0] as [number, number])
          )
          mapInstance.current.fitBounds(bounds, { padding: 70, maxZoom: 16 })
        } catch (e) {}

        // Notify parent component of route distance & duration
        onRouteFoundRef.current?.(routeRes.distanceKm, routeRes.durationMin)
      })

      return () => {
        isMounted = false
        removeRoute()
      }
    } else {
      removeRoute()

      if (dropoffLat && dropoffLng) {
        const originLat = pickupLat ?? clientLocation?.lat
        const originLng = pickupLng ?? clientLocation?.lng

        if (originLat && originLng) {
          try {
            const bounds = new maplibregl.LngLatBounds()
              .extend([originLng, originLat])
              .extend([dropoffLng, dropoffLat])
            map.fitBounds(bounds, { padding: 80, maxZoom: 15 })
          } catch (e) {}
        } else {
          map.flyTo({ center: [dropoffLng, dropoffLat], zoom: 15 })
        }
      } else if (pickupLat && pickupLng && !dropoffLat && !clientLocation) {
        map.flyTo({ center: [pickupLng, pickupLat], zoom: 15 })
      }
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType, locations, clientLocation, drivers])

  // Custom Goong AutoComplete Search Box
  useEffect(() => {
    let cleanUpClickOutside: (() => void) | null = null

    const checkAndInit = () => {
      if (!searchInputRef?.current) return
      const container = searchInputRef.current

      if (container.querySelector('input.goong-search-input')) return

      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'Tìm kiếm địa điểm trên CoToom (Goong 3D)...'
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
