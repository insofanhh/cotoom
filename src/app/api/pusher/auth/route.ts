import { NextRequest, NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.text()
    const params = new URLSearchParams(body)
    const socketId = params.get('socket_id')!
    const channel = params.get('channel_name')!

    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
      user_id: session.user.id,
      user_info: { name: session.user.name },
    })

    return NextResponse.json(authResponse)
  } catch (error) {
    return NextResponse.json({ message: 'Auth failed' }, { status: 403 })
  }
}
