import { NextResponse } from 'next/server'
import { getPricePerKm } from '@/lib/pricing'

// GET /api/settings/pricing — public price table for the booking UI
export async function GET() {
  const pricePerKm = await getPricePerKm()
  return NextResponse.json({ pricePerKm })
}
