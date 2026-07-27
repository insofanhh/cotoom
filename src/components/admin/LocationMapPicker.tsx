'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getGoongTileUrl, goongReverseGeocode, goongAutoComplete, goongPlaceDetail } from '@/lib/goong'

interface LocationMapPickerProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number, address?: string) => void
}

// Fix Leaflet icons globally
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function LocationMapPicker({ lat, lng, onChange }: LocationMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  const searchInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const initialLat = lat || 20.9892
  const initialLng = lng || 107.7695

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([initialLat, initialLng], 14)

    L.tileLayer(getGoongTileUrl(), { maxZoom: 20 }).addTo(map)
    mapInstance.current = map

    // Draggable marker
    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map)
    markerRef.current = marker

    marker.on('dragend', async () => {
      const pos = marker.getLatLng()
      const result = await goongReverseGeocode(pos.lat, pos.lng)
      onChangeRef.current(
        Number(pos.lat.toFixed(6)),
        Number(pos.lng.toFixed(6)),
        result.address
      )
    })

    // Click map to reposition marker
    map.on('click', async (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      const result = await goongReverseGeocode(e.latlng.lat, e.latlng.lng)
      onChangeRef.current(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
        result.address
      )
    })

    return () => {
      map.stop()
      map.off()
      map.remove()
      mapInstance.current = null
      markerRef.current = null
    }
  }, [])

  // Sync marker position if props change
  useEffect(() => {
    if (mapInstance.current && markerRef.current && lat && lng) {
      const pos = markerRef.current.getLatLng()
      if (Math.abs(pos.lat - lat) > 0.00001 || Math.abs(pos.lng - lng) > 0.00001) {
        markerRef.current.setLatLng([lat, lng])
        mapInstance.current.setView([lat, lng], 15)
      }
    }
  }, [lat, lng])

  // Setup Goong AutoComplete search bar inside picker
  useEffect(() => {
    if (!searchInputRef.current) return
    const container = searchInputRef.current
    container.innerHTML = ''

    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Tìm địa điểm trên bản đồ Goong để chọn vị trí...'
    input.className =
      'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

    const resultsDiv = document.createElement('div')
    resultsDiv.className =
      'absolute top-full left-0 w-full bg-white shadow-xl mt-1 rounded-lg overflow-hidden z-[1000] hidden flex-col max-h-[200px] overflow-y-auto border border-slate-100'

    container.style.position = 'relative'
    container.appendChild(input)
    container.appendChild(resultsDiv)

    let timeout: NodeJS.Timeout

    input.addEventListener('input', (e: any) => {
      const val = e.target.value
      clearTimeout(timeout)
      if (!val || !val.trim()) {
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
              'px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs text-slate-700'

            const mainText = item.structured_formatting?.main_text || item.description
            const secondaryText = item.structured_formatting?.secondary_text || ''

            div.innerHTML = `
              <p class="font-semibold text-slate-800">${mainText}</p>
              ${secondaryText ? `<p class="text-[10px] text-slate-400 truncate">${secondaryText}</p>` : ''}
            `

            div.onclick = async () => {
              resultsDiv.classList.add('hidden')
              resultsDiv.classList.remove('flex')
              input.value = mainText

              const detail = await goongPlaceDetail(item.place_id)
              if (detail) {
                if (mapInstance.current && markerRef.current) {
                  markerRef.current.setLatLng([detail.lat, detail.lng])
                  mapInstance.current.setView([detail.lat, detail.lng], 16)
                }
                onChangeRef.current(
                  Number(detail.lat.toFixed(6)),
                  Number(detail.lng.toFixed(6)),
                  detail.address
                )
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
      }, 300)
    })

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
  }, [])

  return (
    <div className="space-y-2">
      <div ref={searchInputRef} className="relative z-[500]" />
      <div className="relative w-full h-[250px] rounded-xl overflow-hidden border border-slate-200 shadow-inner">
        <div ref={mapRef} className="absolute inset-0 z-0" />
      </div>
      <p className="text-[11px] text-slate-500 italic text-center">
        * Chạm/bấm vào bản đồ hoặc kéo ghim marker đến vị trí chính xác của địa điểm.
      </p>
    </div>
  )
}
