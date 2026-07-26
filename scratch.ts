import { PrismaClient } from './src/generated/prisma'

const prisma = new PrismaClient()

async function test() {
  try {
    const drivers = await prisma.driverProfile.findMany({
      where: {
        isOnline: true,
        latitude: { not: null },
        longitude: { not: null }
      },
      include: { user: { select: { name: true, phone: true } } }
    })
    console.log("Success:", drivers.length, "drivers found")
  } catch (err) {
    console.error("Error:", err)
  } finally {
    await prisma.$disconnect()
  }
}
test()
