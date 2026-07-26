import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/push/subscribe — register this browser for push notifications
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { endpoint, keys } = await req.json()
    if (typeof endpoint !== 'string' || !endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ message: 'Invalid subscription' }, { status: 400 })
    }

    // Endpoint is unique per browser — re-subscribing moves it to the current user
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/push/subscribe]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/push/subscribe — unregister this browser
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const { endpoint } = await req.json()
    if (typeof endpoint === 'string' && endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: session.user.id },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
