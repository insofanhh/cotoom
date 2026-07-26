import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { rating, comment } = await req.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'Invalid rating' }, { status: 400 })
    }

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { review: true }
    })

    if (!ride) {
      return NextResponse.json({ message: 'Ride not found' }, { status: 404 })
    }

    if (ride.clientId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (ride.status !== 'COMPLETED') {
      return NextResponse.json({ message: 'Ride is not completed' }, { status: 400 })
    }

    if (ride.review) {
      return NextResponse.json({ message: 'Already reviewed' }, { status: 400 })
    }

    // 1. Create Review
    const review = await prisma.review.create({
      data: {
        rideId: ride.id,
        rating,
        comment
      }
    })

    // 2. Update Driver Average Rating
    if (ride.driverId) {
      const allDriverReviews = await prisma.review.findMany({
        where: {
          ride: { driverId: ride.driverId }
        }
      })
      
      const totalScore = allDriverReviews.reduce((sum, r) => sum + r.rating, 0)
      const avg = totalScore / allDriverReviews.length

      await prisma.driverProfile.update({
        where: { userId: ride.driverId },
        data: { ratingAvg: avg }
      })
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error('[POST /api/rides/[id]/review]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
