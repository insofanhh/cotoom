import { Suspense } from 'react'
import { MobileShell } from '@/components/layout/MobileShell'
import { HeroSearch } from '@/components/home/HeroSearch'
import {
  FeaturedSpots,
  FeaturedSpotsSkeleton,
} from '@/components/home/FeaturedSpots'
import {
  HomestayRestaurantSection,
  HomestayRestaurantSkeleton,
} from '@/components/home/HomestayRestaurantSection'
import { QuickRideButton } from '@/components/home/QuickRideButton'
import { prisma } from '@/lib/prisma'

// Data comes from the database — don't try to prerender at build time
export const dynamic = 'force-dynamic'

async function getHomeData() {
  const [attractions, homestays, restaurants] = await Promise.all([
    prisma.location.findMany({
      where: { type: 'ATTRACTION' },
      orderBy: { viewCount: 'desc' },
      take: 6,
    }),
    prisma.location.findMany({
      where: { type: 'HOMESTAY' },
      orderBy: { viewCount: 'desc' },
      take: 4,
    }),
    prisma.location.findMany({
      where: { type: 'RESTAURANT' },
      orderBy: { viewCount: 'desc' },
      take: 4,
    }),
  ])
  return { attractions, homestays, restaurants }
}

export default async function HomePage() {
  const { attractions, homestays, restaurants } = await getHomeData()

  return (
    <MobileShell>
      <div className="pb-nav">
        {/* Hero */}
        <HeroSearch />

        {/* Quick Ride Button */}
        <div className="px-4 -mt-1 pt-4">
          <QuickRideButton />
        </div>

        {/* Featured Spots */}
        <Suspense fallback={<FeaturedSpotsSkeleton />}>
          <FeaturedSpots
            spots={attractions.map((a) => ({
              ...a,
              images: (a.images as string[]) ?? [],
            }))}
          />
        </Suspense>

        {/* Divider */}
        <div className="mx-4 h-px bg-slate-100" />

        {/* Homestays */}
        <Suspense fallback={<HomestayRestaurantSkeleton />}>
          <HomestayRestaurantSection
            title="Homestay nổi bật"
            type="HOMESTAY"
            items={homestays.map((h) => ({
              ...h,
              images: (h.images as string[]) ?? [],
            }))}
          />
        </Suspense>

        {/* Divider */}
        <div className="mx-4 h-px bg-slate-100" />

        {/* Restaurants */}
        <Suspense fallback={<HomestayRestaurantSkeleton />}>
          <HomestayRestaurantSection
            title="Ẩm thực & Nhà hàng"
            type="RESTAURANT"
            items={restaurants.map((r) => ({
              ...r,
              images: (r.images as string[]) ?? [],
            }))}
          />
        </Suspense>
      </div>
    </MobileShell>
  )
}
