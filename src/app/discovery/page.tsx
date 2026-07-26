import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { MobileShell } from '@/components/layout/MobileShell'
import { DiscoveryClient } from './DiscoveryClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Khám phá địa điểm',
  description: 'Tìm kiếm và khám phá các điểm du lịch, homestay, nhà hàng tại đảo Cô Tô.',
}

async function getAllLocations() {
  return prisma.location.findMany({
    orderBy: { viewCount: 'desc' },
  })
}

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}) {
  const params = await searchParams
  const locations = await getAllLocations()

  const formatted = locations.map((l) => ({
    ...l,
    images: (l.images as string[]) ?? [],
  }))

  return (
    <MobileShell>
      <Suspense fallback={null}>
        <DiscoveryClient
          locations={formatted}
          initialQuery={params.q ?? ''}
          initialType={params.type ?? 'ALL'}
        />
      </Suspense>
    </MobileShell>
  )
}
