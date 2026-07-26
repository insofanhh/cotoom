import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import RideTrackingClient from './RideTrackingClient'
import { MobileShell } from '@/components/layout/MobileShell'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Theo dõi chuyến đi' }

interface Params {
  params: Promise<{ id: string }>
}

export default async function RideTrackingPage({ params }: Params) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const ride = await prisma.ride.findUnique({
    where: { id },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
          driverProfile: {
            select: {
              vehiclePlate: true,
              latitude: true,
              longitude: true
            }
          }
        }
      },
      review: true
    }
  })

  if (!ride) redirect('/history')
  if (ride.clientId !== session.user.id) redirect('/history')

  return (
    <MobileShell>
      <RideTrackingClient initialRide={ride} />
    </MobileShell>
  )
}
