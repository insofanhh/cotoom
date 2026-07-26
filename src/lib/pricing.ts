import { prisma } from '@/lib/prisma'
import type { VehicleType } from '@/types'

// Fallbacks when a setting row is missing or malformed
export const DEFAULT_PRICE_PER_KM: Record<VehicleType, number> = {
  MOTORBIKE: 15000,
  CAR: 25000,
  ELECTRIC_CAR: 20000,
}

const SETTING_KEYS: Record<VehicleType, string> = {
  MOTORBIKE: 'price_per_km_motorbike',
  CAR: 'price_per_km_car',
  ELECTRIC_CAR: 'price_per_km_electric',
}

/** Admin-configured price per km for each vehicle type. */
export async function getPricePerKm(): Promise<Record<VehicleType, number>> {
  const rates = { ...DEFAULT_PRICE_PER_KM }
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(SETTING_KEYS) } },
    })
    for (const [vehicle, key] of Object.entries(SETTING_KEYS) as [VehicleType, string][]) {
      const parsed = parseFloat(rows.find((r) => r.key === key)?.value ?? '')
      if (!isNaN(parsed) && parsed > 0) rates[vehicle] = parsed
    }
  } catch {
    // DB unavailable — defaults keep the flow working
  }
  return rates
}

/** Price formula: admin rate per km x routed distance, rounded to 1000 VND. */
export function computePrice(ratePerKm: number, distanceKm: number): number {
  return Math.round((ratePerKm * distanceKm) / 1000) * 1000
}
