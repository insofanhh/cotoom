import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push'

// POST /api/push/test — send a test notification to the caller's own devices
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const subscriptions = await prisma.pushSubscription.count({
      where: { userId: session.user.id },
    })

    if (subscriptions > 0) {
      await sendPushToUser(session.user.id, {
        title: '🔔 Thông báo thử từ CoToom',
        body: 'Tuyệt vời! Thiết bị của bạn đã nhận được thông báo đẩy.',
        url: '/',
        tag: 'push-test',
      })
    }

    return NextResponse.json({ ok: true, subscriptions })
  } catch (error) {
    console.error('[POST /api/push/test]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
