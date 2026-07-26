'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-geosearch/dist/geosearch.css'
import { OpenStreetMapProvider } from 'leaflet-geosearch'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

interface LeafletMapCoreProps {
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
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  }),
  HOMESTAY: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  }),
  RESTAURANT: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  }),
  DEFAULT: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  })
}

// Client Location Icon (Pulsing Dot)
const clientIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6"><div class="absolute w-full h-full bg-blue-500 rounded-full opacity-50 animate-ping"></div><div class="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-md z-10"></div></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

// Driver Icon
const driverIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-8 h-8 bg-slate-800 rounded-full shadow-lg border-2 border-white text-white text-lg">🚘</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
})

export default function LeafletMapCore({ pickupLat, pickupLng, dropoffLat, dropoffLng, searchInputRef, onLocationSelect, locations, clientLocation, drivers }: LeafletMapCoreProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const routingControlRef = useRef<any>(null)
  const onLocationSelectRef = useRef(onLocationSelect)

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
  }, [onLocationSelect])

  // Init Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      // Markers/tooltips animating during zoom crash with "_leaflet_pos of undefined"
      // when React removes them mid-animation — keep zoom smooth but opt them out
      markerZoomAnimation: false,
    }).setView([20.9892, 107.7695], 14) // Co To center
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    mapInstance.current = map

    // Reverse Geocode on map click
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      try {
        const results = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        const data = await results.json()
        if (data && data.display_name) {
          onLocationSelectRef.current?.(lat, lng, data.display_name, 'Vị trí đã ghim')
        } else {
          onLocationSelectRef.current?.(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'Vị trí đã ghim')
        }
      } catch (error) {
         onLocationSelectRef.current?.(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'Vị trí đã ghim')
      }
    })

    return () => {
      try {
        if (routingControlRef.current) {
          try {
            routingControlRef.current.getPlan().setWaypoints([])
            map.removeControl(routingControlRef.current)
          } catch (e) {}
          routingControlRef.current = null
        }
        map.stop() // cancel in-flight pan/zoom animations before tearing down panes
        map.off()
        map.remove()
      } catch (e) {
        console.warn('Error during map cleanup', e)
      }
      mapInstance.current = null
    }
  }, [])

  // Update Markers and Route
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // Clear old markers (do not remove routing control here to reuse it)
    markersRef.current.forEach(m => {
      try { m.remove() } catch (e) {}
    })
    markersRef.current = []

    // Render predefined locations
    if (locations && locations.length > 0 && !dropoffLat) {
      locations.forEach((loc) => {
        if (loc.latitude && loc.longitude) {
          const typeIcon = icons[loc.type] || icons.DEFAULT;
          const m = L.marker([loc.latitude, loc.longitude], { icon: typeIcon, title: loc.name })
            .bindTooltip(loc.name, { permanent: true, direction: 'top', className: 'bg-white border-0 shadow-sm text-xs font-bold text-slate-700 px-2 py-1 rounded-md mb-1', offset: [0, -25] })
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
      const m = L.marker([clientLocation.lat, clientLocation.lng], { icon: clientIcon, zIndexOffset: 1000 }).addTo(map)
      markersRef.current.push(m)
      
      // Auto-center on client if no pickup/dropoff
      if (!pickupLat && !dropoffLat) {
        map.setView([clientLocation.lat, clientLocation.lng], 15)
      }
    }

    // Render Drivers
    if (drivers && drivers.length > 0) {
      drivers.forEach(d => {
        if (d.latitude && d.longitude) {
           let lat = d.latitude
           let lng = d.longitude
           
           // Slight offset if overlapping with pickup or client
           if ((pickupLat === lat && pickupLng === lng) || 
               (clientLocation && clientLocation.lat === lat && clientLocation.lng === lng)) {
             lng += 0.00015 
             lat += 0.00005
           }

           const dIcon = L.divIcon({
             html: `<div class="flex items-center justify-center w-8 h-8 bg-slate-800 rounded-full shadow-lg border-2 border-white text-white text-[14px]">${d.vehicleType === 'MOTORBIKE' ? '🏍️' : '🚘'}</div>`,
             className: '',
             iconSize: [32, 32],
             iconAnchor: [16, 16]
           })
           const m = L.marker([lat, lng], { icon: dIcon }).addTo(map)
           markersRef.current.push(m)
        }
      })
    }

    const waypoints = []

    if (pickupLat && pickupLng) {
      const p = L.latLng(pickupLat, pickupLng)
      waypoints.push(p)
      const m = L.marker(p, { title: 'Điểm đón' }).addTo(map)
      markersRef.current.push(m)
    }

    if (dropoffLat && dropoffLng) {
      const p = L.latLng(dropoffLat, dropoffLng)
      waypoints.push(p)
      const m = L.marker(p, { title: 'Điểm đến' }).addTo(map)
      markersRef.current.push(m)
    }

    if (waypoints.length === 2) {
      if (!routingControlRef.current) {
        routingControlRef.current = (L as any).Routing.control({
          waypoints,
          lineOptions: {
            styles: [{ color: '#3b82f6', weight: 4 }]
          },
          createMarker: () => null, // Hide default routing markers
          addWaypoints: false,
          routeWhileDragging: false,
          // OSRM responds async — fit bounds manually so a route arriving after
          // the map is torn down can't animate a dead map
          fitSelectedRoutes: false,
          show: false, // Hide instruction panel
        })
          .on('routesfound', (e: any) => {
            const liveMap = mapInstance.current
            const coords = e.routes?.[0]?.coordinates
            if (liveMap && coords?.length) {
              try { liveMap.fitBounds(L.latLngBounds(coords), { padding: [40, 40] }) } catch (err) {}
            }
          })
          .addTo(map)
      } else {
        try { routingControlRef.current.setWaypoints(waypoints) } catch (e) {}
      }
    } else {
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current)
        } catch (e) {
          console.warn('Error removing routing control', e)
        }
        routingControlRef.current = null
      }
      
      if (waypoints.length === 1 && !clientLocation) {
        map.setView(waypoints[0], 15)
      }
    }

  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, locations, clientLocation, drivers])

  // Custom Autocomplete Search Box
  useEffect(() => {
    if (!searchInputRef?.current) return
    const container = searchInputRef.current
    
    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Tìm kiếm địa điểm (OpenStreetMap)...'
    input.className = 'w-full h-full bg-transparent border-none outline-none px-4 py-2 text-sm text-slate-800 placeholder-slate-400'
    input.style.minHeight = '44px'
    
    const resultsDiv = document.createElement('div')
    resultsDiv.className = 'absolute top-full left-0 w-full bg-white shadow-lg mt-1 rounded-md overflow-hidden z-[1000] hidden flex-col max-h-[250px] overflow-y-auto'
    
    container.innerHTML = ''
    container.style.position = 'relative'
    container.appendChild(input)
    container.appendChild(resultsDiv)
    
    let timeout: NodeJS.Timeout
    const provider = new OpenStreetMapProvider({
      params: {
        countrycodes: 'vn'
      }
    })
    
    input.addEventListener('input', (e: any) => {
      const val = e.target.value
      clearTimeout(timeout)
      if (!val) {
        resultsDiv.classList.add('hidden')
        resultsDiv.classList.remove('flex')
        return
      }
      
      timeout = setTimeout(async () => {
        try {
          const results = await provider.search({ query: val })
          if (results.length > 0) {
            resultsDiv.innerHTML = ''
            results.forEach((res: any) => {
              const div = document.createElement('div')
              div.className = 'px-4 py-3 hover:bg-slate-100 cursor-pointer border-b last:border-0 text-sm text-slate-700'
              div.innerText = res.label
              div.onclick = () => {
                onLocationSelectRef.current?.(res.y, res.x, res.label, res.label.split(',')[0])
                resultsDiv.classList.add('hidden')
                resultsDiv.classList.remove('flex')
                input.value = res.label.split(',')[0]
              }
              resultsDiv.appendChild(div)
            })
            resultsDiv.classList.remove('hidden')
            resultsDiv.classList.add('flex')
          } else {
            resultsDiv.classList.add('hidden')
            resultsDiv.classList.remove('flex')
          }
        } catch (error) {
          console.error(error)
        }
      }, 500)
    })
    
    // Close on click outside
    const onClickOutside = (e: any) => {
      if (!container.contains(e.target)) {
        resultsDiv.classList.add('hidden')
        resultsDiv.classList.remove('flex')
      }
    }
    document.addEventListener('click', onClickOutside)
    
    return () => {
      document.removeEventListener('click', onClickOutside)
    }
  }, [searchInputRef])

  return <div ref={mapRef} className="absolute inset-0 bg-slate-100 z-0" />
}
