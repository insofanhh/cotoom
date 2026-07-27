const GOONG_MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ''
const GOONG_API_KEY = process.env.NEXT_PUBLIC_GOONG_API_KEY || ''

export function getGoongVectorStyleUrl() {
  const key = GOONG_MAPTILES_KEY || GOONG_API_KEY
  return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${key}`
}
