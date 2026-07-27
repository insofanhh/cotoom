import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const drivers = await prisma.driverProfile.findMany({
      include: { user: { select: { name: true, phone: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(drivers)
  } catch (error) {
    console.error('[GET /api/admin/drivers]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { driverId, action } = body

    if (!driverId || !['approve', 'reject', 'freeze', 'unfreeze'].includes(action)) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
    }

    const newStatus =
      action === 'approve' ? 'APPROVED'
      : action === 'reject'  ? 'REJECTED'
      : action === 'freeze'  ? 'FROZEN'
      : 'APPROVED' // unfreeze

    // Step 1: Fetch userId BEFORE update so we can use it for Pusher.
    // We avoid calling findUnique AFTER the raw update to prevent Prisma
    // from crashing if the client still has a stale enum cache.
    const existing = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      select: { userId: true },
    })

    if (!existing) {
      return NextResponse.json({ message: 'Driver not found' }, { status: 404 })
    }

    // Step 2: Raw SQL update using camelCase column names (Prisma 7.x convention)
    // `isOnline` and `status` match the actual MySQL column names created by the migration
    if (action === 'freeze') {
      await prisma.$executeRaw`
        UPDATE driver_profiles
        SET status = ${newStatus}, \`isOnline\` = false, updatedAt = NOW()
        WHERE id = ${driverId}
      `
    } else {
      await prisma.$executeRaw`
        UPDATE driver_profiles
        SET status = ${newStatus}, updatedAt = NOW()
        WHERE id = ${driverId}
      `
    }

    // Step 3: If approved, promote user role
    if (action === 'approve') {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { role: 'DRIVER' },
      })
    }

    // Step 4: Notify driver via Pusher
    if (action === 'freeze' || action === 'unfreeze') {
      try {
        await pusherServer.trigger(`private-driver-${existing.userId}`, 'account:status', {
          status: newStatus,
          message:
            action === 'freeze'
              ? 'Tài khoản của bạn đã bị đóng băng bởi quản trị viên.'
              : 'Tài khoản của bạn đã được kích hoạt lại!',
        })
      } catch {
        // Ignore Pusher errors
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/admin/drivers]', error)
    return NextResponse.json({ message: 'Server error', detail: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const driverId = searchParams.get('driverId')

    if (!driverId) {
      return NextResponse.json({ message: 'Missing driverId' }, { status: 400 })
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      select: { userId: true },
    })

    if (!profile) {
      return NextResponse.json({ message: 'Driver not found' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id: profile.userId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/drivers]', error)
    return NextResponse.json({ message: 'Server error', detail: String(error) }, { status: 500 })
  }
}
