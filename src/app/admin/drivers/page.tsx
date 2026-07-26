import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminShell } from '@/components/layout/AdminShell'
import { AdminDriversClient } from './AdminDriversClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quản lý tài xế' }

export default async function AdminDriversPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  const drivers = await prisma.driverProfile.findMany({
    include: { user: { select: { name: true, phone: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AdminShell title="Quản lý tài xế">
      <AdminDriversClient drivers={drivers} />
    </AdminShell>
  )
}
