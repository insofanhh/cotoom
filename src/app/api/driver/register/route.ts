import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const { name, phone, password, vehicleType, vehiclePlate } = await req.json()

    if (!name || !phone || !vehicleType || !vehiclePlate) {
      return NextResponse.json({ message: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    if (session?.user) {
      // Authenticated user upgrading to driver
      const existingProfile = await prisma.driverProfile.findUnique({
        where: { userId: session.user.id }
      })
      if (existingProfile) {
        return NextResponse.json({ message: 'Bạn đã đăng ký làm tài xế rồi' }, { status: 400 })
      }

      await prisma.driverProfile.create({
        data: {
          userId: session.user.id,
          vehicleType,
          vehiclePlate,
          status: 'PENDING_APPROVAL',
        }
      })

      // Update name if changed
      if (name !== session.user.name) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { name }
        })
      }
      return NextResponse.json({ message: 'Đã gửi hồ sơ thành công' }, { status: 201 })
    }

    // New user registration
    if (!password) {
      return NextResponse.json({ message: 'Thiếu mật khẩu' }, { status: 400 })
    }

    // Check if phone already exists
    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json({ message: 'Số điện thoại đã được đăng ký' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role: 'CLIENT', // Will change to DRIVER upon approval
        driverProfile: {
          create: {
            vehicleType,
            vehiclePlate,
            status: 'PENDING_APPROVAL',
          },
        },
      },
    })

    return NextResponse.json({ id: user.id, message: 'Đã gửi hồ sơ thành công' }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/driver/register]', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
