const GOONG_API_KEY = process.env.NEXT_PUBLIC_GOONG_API_KEY || ''
const GOONG_MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ''

export function getGoongTileUrl() {
  // Goong MapTiles require a valid Map Tiles key from account.goong.io (e.g. 20+ chars, not placeholder like "Cotoom")
  const isMapTilesKeyValid =
    GOONG_MAPTILES_KEY &&
    GOONG_MAPTILES_KEY.length >= 20 &&
    GOONG_MAPTILES_KEY.toLowerCase() !== 'cotoom'

  if (isMapTilesKeyValid) {
    return `https://tiles.goong.io/assets/goong_map_web/{z}/{x}/{y}.png?api_key=${GOONG_MAPTILES_KEY}`
  }

  // Fallback to standard OpenStreetMap tile layer for map background tiles
  return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
}

export async function goongReverseGeocode(lat: number, lng: number): Promise<{ address: string; name: string }> {
  try {
    const url = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.results && data.results.length > 0) {
      const first = data.results[0]
      const name = first.name || first.compound?.name || 'Vị trí đã ghim'
      const address = first.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      return { address, name }
    }
  } catch (err) {
    console.error('[Goong ReverseGeocode Error]', err)
  }
  return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, name: 'Vị trí đã ghim' }
}

export async function goongAutoComplete(query: string, location = '20.9892,107.7695'): Promise<any[]> {
  try {
    const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&location=${location}&input=${encodeURIComponent(query)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.predictions || []
  } catch (err) {
    console.error('[Goong AutoComplete Error]', err)
    return []
  }
}

export async function goongPlaceDetail(placeId: string): Promise<{ lat: number; lng: number; address: string; name: string } | null> {
  try {
    const url = `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${GOONG_API_KEY}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.result && data.result.geometry?.location) {
      const loc = data.result.geometry.location
      return {
        lat: loc.lat,
        lng: loc.lng,
        address: data.result.formatted_address || data.result.name,
        name: data.result.name || 'Điểm đến',
      }
    }
  } catch (err) {
    console.error('[Goong PlaceDetail Error]', err)
  }
  return null
}

export interface GoongRouteResult {
  distanceKm: number
  durationMin: number
  coordinates: [number, number][] // [lat, lng] array for Leaflet polyline
}

export async function goongGetDirection(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  vehicleType: string = 'MOTORBIKE'
): Promise<GoongRouteResult | null> {
  try {
    // Vehicle mapping: MOTORBIKE -> bike, CAR / ELECTRIC_CAR -> car
    const vehicle = vehicleType === 'MOTORBIKE' ? 'bike' : 'car'
    const originStr = `${pickup.lat},${pickup.lng}`
    const destStr = `${dropoff.lat},${dropoff.lng}`
    const url = `https://rsapi.goong.io/Direction?origin=${originStr}&destination=${destStr}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}`
    
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      const leg = route.legs?.[0]
      const distanceMeters = leg?.distance?.value ?? route.distance ?? 0
      const durationSeconds = leg?.duration?.value ?? route.duration ?? 0
      
      const distanceKm = distanceMeters / 1000
      const durationMin = Math.max(1, Math.round(durationSeconds / 60))

      // Decode Overview Polyline geometry
      const encodedPolyline = route.overview_polyline?.points
      const coordinates = encodedPolyline ? decodePolyline(encodedPolyline) : [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]

      return {
        distanceKm,
        durationMin,
        coordinates: coordinates as [number, number][],
      }
    }
  } catch (err) {
    console.error('[Goong Direction Error]', err)
  }
  return null
}

// Decode Mapbox/Goong encoded polyline points string into array of [lat, lng]
export function decodePolyline(str: string, precision: number = 5): [number, number][] {
  let index = 0
  let lat = 0
  let lng = 0
  const coordinates: [number, number][] = []
  let shift = 0
  let result = 0
  let byte: number | null = null
  const factor = Math.pow(10, precision)

  while (index < str.length) {
    byte = null
    shift = 0
    result = 0

    do {
      byte = str.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0

    do {
      byte = str.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push([lat / factor, lng / factor])
  }

  return coordinates
}
