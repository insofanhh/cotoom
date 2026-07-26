import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, phone, password } = await req.json()

    if (!name || !phone || !password) {
      return NextResponse.json({ message: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json({ message: 'Số điện thoại đã được đăng ký' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, phone, passwordHash, role: 'CLIENT' },
      select: { id: true, name: true, phone: true, role: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
