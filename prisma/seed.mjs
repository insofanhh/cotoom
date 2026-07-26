// ESM seed — uses @prisma/client which re-exports from the generated output
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env — an explicitly-set DATABASE_URL (e.g. seeding a remote DB) wins over .env files
const hasExplicitUrl = !!process.env.DATABASE_URL
config({ path: path.resolve(__dirname, '../.env.local'), override: !hasExplicitUrl })
config({ path: path.resolve(__dirname, '../.env') })

// Dynamic import for the generated TS client via tsx
const { PrismaClient } = await import('../src/generated/prisma/client.ts')

function parseConnectionString(url) {
  const parsed = new URL(url)
  const useSsl = ['true', '1'].includes(parsed.searchParams.get('ssl') ?? '')
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306'),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    connectionLimit: 5,
    ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  }
}

const adapter = new PrismaMariaDb(parseConnectionString(process.env.DATABASE_URL))
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌊 Seeding CoToom database...')

  const settings = [
    { key: 'price_per_km_motorbike', value: '15000' },
    { key: 'price_per_km_car', value: '25000' },
    { key: 'price_per_km_electric', value: '20000' },
    { key: 'admin_zalo_phone', value: '0901234567' },
    { key: 'base_fare_motorbike', value: '10000' },
    { key: 'base_fare_car', value: '20000' },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s })
  }
  console.log('✅ Settings seeded')

  const locations = [
    { name: 'Bãi Vàn Chảy', type: 'ATTRACTION', description: 'Bãi tắm đẹp nhất đảo Cô Tô với bãi cát trắng mịn, nước biển xanh trong vắt.', images: ['/uploads/van-chay-1.jpg'], latitude: 20.9892, longitude: 107.7695, priceRange: 'Miễn phí', contactPhone: null },
    { name: 'Đỉnh Hải Đăng Cô Tô', type: 'ATTRACTION', description: 'Ngọn hải đăng lịch sử trên đỉnh cao nhất đảo. Nơi Chủ tịch Hồ Chí Minh đã từng thăm.', images: ['/uploads/hai-dang-1.jpg'], latitude: 20.9978, longitude: 107.7756, priceRange: 'Miễn phí', contactPhone: null },
    { name: 'Bãi Tình Yêu', type: 'ATTRACTION', description: 'Bãi biển hoang sơ tuyệt đẹp với tên gọi lãng mạn, phù hợp cho các cặp đôi.', images: ['/uploads/tinh-yeu-1.jpg'], latitude: 21.0045, longitude: 107.7612, priceRange: 'Miễn phí', contactPhone: null },
    { name: 'Homestay Biển Xanh', type: 'HOMESTAY', description: 'Homestay view biển tuyệt đẹp, phòng sạch sẽ. Bao gồm bữa sáng và có thể thuê xe máy tại chỗ.', images: ['/uploads/homestay-bien-xanh-1.jpg'], latitude: 20.9875, longitude: 107.7711, priceRange: '300.000 - 600.000 VND/đêm', contactPhone: '0901111222' },
    { name: 'Homestay Cô Tô Xanh', type: 'HOMESTAY', description: 'Khu homestay hiện đại ngay trung tâm đảo, gần chợ và bến tàu.', images: ['/uploads/homestay-coto-xanh-1.jpg'], latitude: 20.9861, longitude: 107.7683, priceRange: '400.000 - 800.000 VND/đêm', contactPhone: '0902222333' },
    { name: 'Nhà hàng Hải Sản Tươi Sống', type: 'RESTAURANT', description: 'Nhà hàng hải sản tươi ngon trực tiếp từ ngư dân đảo. Đặc sản: Cá mú, tôm hùm, bạch tuộc nướng.', images: ['/uploads/hai-san-1.jpg'], latitude: 20.9843, longitude: 107.7698, priceRange: '200.000 - 1.000.000 VND/người', contactPhone: '0903333444' },
    { name: 'Quán Ăn Đảo Xanh', type: 'RESTAURANT', description: 'Quán ăn bình dân nhưng ngon miệng. Chuyên phục vụ các món đặc sản đảo: bún cá, cháo hải sản.', images: ['/uploads/dao-xanh-1.jpg'], latitude: 20.9856, longitude: 107.7672, priceRange: '50.000 - 150.000 VND/người', contactPhone: '0904444555' },
    { name: 'Cầu Tàu Cô Tô', type: 'ATTRACTION', description: 'Cầu tàu chính của đảo, điểm tham quan đẹp vào bình minh và hoàng hôn.', images: ['/uploads/cau-tau-1.jpg'], latitude: 20.9820, longitude: 107.7701, priceRange: 'Miễn phí', contactPhone: null },
  ]

  const existingCount = await prisma.location.count()
  if (existingCount === 0) {
    for (const loc of locations) { await prisma.location.create({ data: loc }) }
    console.log(`✅ ${locations.length} locations seeded`)
  } else {
    console.log(`ℹ️  ${existingCount} locations already exist, skipping`)
  }

  const adminHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { phone: '0900000000' },
    update: {},
    create: { name: 'Admin CoToom', phone: '0900000000', passwordHash: adminHash, role: 'ADMIN' },
  })
  console.log('✅ Admin user: 0900000000 / admin123')
  console.log('🎉 Done!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
