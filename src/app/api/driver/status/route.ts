import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json({ message: 'Hồ sơ tài xế không tồn tại' }, { status: 404 })
    }

    if (profile.status !== 'APPROVED') {
      // Force offline in database if account is frozen, pending, or rejected
      if (profile.isOnline) {
        await prisma.driverProfile.update({
          where: { userId: session.user.id },
          data: { isOnline: false },
        })
      }
      const message =
        profile.status === 'FROZEN'
          ? 'Tài khoản của bạn đang bị đóng băng. Vui lòng liên hệ Admin.'
          : profile.status === 'PENDING_APPROVAL'
          ? 'Tài khoản của bạn đang chờ phê duyệt.'
          : 'Tài khoản của bạn đã bị từ chối.'

      return NextResponse.json({ message, isOnline: false }, { status: 403 })
    }

    const { isOnline } = await req.json()

    const updated = await prisma.driverProfile.update({
      where: { userId: session.user.id },
      data: { isOnline },
    })

    return NextResponse.json({ isOnline: updated.isOnline })
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
