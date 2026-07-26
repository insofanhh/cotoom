import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminShell } from '@/components/layout/AdminShell'
import { AdminSettingsClient } from './AdminSettingsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Cài đặt hệ thống' }

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  const settings = await prisma.setting.findMany()
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  return (
    <AdminShell title="Cài đặt hệ thống">
      <AdminSettingsClient settings={settingsMap} />
    </AdminShell>
  )
}
