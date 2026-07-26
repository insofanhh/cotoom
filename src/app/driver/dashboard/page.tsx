import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DriverDashboardClient } from './DriverDashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard Tài xế' }

export default async function DriverDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'DRIVER' && session.user.role !== 'ADMIN') redirect('/')

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!profile) redirect('/driver/register')

  const activeRide = await prisma.ride.findFirst({
    where: {
      driverId: session.user.id,
      status: { in: ['ACCEPTED', 'IN_PROGRESS'] }
    },
    include: { client: { select: { name: true, phone: true } } }
  })

  return (
    <DriverDashboardClient 
      profile={profile} 
      userId={session.user.id} 
      userName={session.user.name} 
      initialActiveRide={activeRide}
    />
  )
}
