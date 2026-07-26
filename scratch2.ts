import { PrismaClient } from './src/generated/prisma'

const prisma = new PrismaClient()

async function test() {
  try {
    const drivers = await prisma.driverProfile.findMany({
      where: {
        status: 'APPROVED',
        isOnline: true,
        isBusy: false,
        vehicleType: 'MOTORBIKE',
      },
      orderBy: { ratingAvg: 'desc' },
      include: { user: { select: { id: true } } },
    })
    console.log("Found drivers:", drivers.length)
    console.log(drivers)
  } catch (err) {
    console.error("Error:", err)
  } finally {
    await prisma.$disconnect()
  }
}
test()
