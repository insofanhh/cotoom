/**
 * POST /api/rides/[id]/dispatch-tick
 *
 * Called by the client polling loop every 2 seconds while a ride is in SEARCHING state.
 * This is what keeps the sequential dispatch engine alive — each tick checks whether
 * the current driver's 15-second window has expired, and if so, advances to the next
 * candidate driver (sending Pusher + Push notification).
 *
 * Returns JSON: { rideStatus: string, message?: string }
 * - rideStatus === 'SEARCHING'  → client continues polling
 * - rideStatus === 'ACCEPTED'   → client stops polling, driver found
 * - rideStatus === 'CANCELLED'  → client stops polling, show error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { advanceDispatch } from '@/lib/dispatchEngine'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: rideId } = await params
    const result = await advanceDispatch(rideId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/rides/dispatch-tick]', error)
    return NextResponse.json({ rideStatus: 'SEARCHING' }) // non-fatal; client retries
  }
}
