import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { MobileShell } from '@/components/layout/MobileShell'
import { LocationDetailClient } from './LocationDetailClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

async function getLocation(id: string) {
  const location = await prisma.location.findUnique({ where: { id } })
  if (!location) return null

  // Increment view count
  await prisma.location.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  })

  return location
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const location = await prisma.location.findUnique({
    where: { id },
    select: { name: true, description: true },
  })
  if (!location) return {}
  return {
    title: location.name,
    description: location.description.slice(0, 160),
  }
}

export default async function LocationDetailPage({ params }: Props) {
  const { id } = await params
  const location = await getLocation(id)

  if (!location) notFound()

  const adminZalo = await prisma.setting.findUnique({
    where: { key: 'admin_zalo_phone' },
  })

  return (
    <MobileShell withBottomNav={false}>
      <LocationDetailClient
        location={{
          ...location,
          images: (location.images as string[]) ?? [],
        }}
        adminZaloPhone={adminZalo?.value ?? ''}
      />
    </MobileShell>
  )
}
