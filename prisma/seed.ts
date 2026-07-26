import { prisma } from '../src/lib/prisma'


async function main() {
  console.log('🌊 Seeding CoToom database...')

  // ─── Default Settings ───────────────────────────────────────
  const settings = [
    { key: 'price_per_km_motorbike', value: '15000' },
    { key: 'price_per_km_car', value: '25000' },
    { key: 'price_per_km_electric', value: '20000' },
    { key: 'admin_zalo_phone', value: '0901234567' },
    { key: 'base_fare_motorbike', value: '10000' },
    { key: 'base_fare_car', value: '20000' },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }
  console.log('✅ Settings seeded')

  // ─── Sample Locations (Co To Island) ────────────────────────
  const locations = [
    {
      name: 'Bãi Vàn Chảy',
      type: 'ATTRACTION' as const,
      description:
        'Bãi tắm đẹp nhất đảo Cô Tô với bãi cát trắng mịn, nước biển xanh trong vắt. Điểm đến lý tưởng để tắm biển và chụp ảnh check-in.',
      images: ['/uploads/van-chay-1.jpg', '/uploads/van-chay-2.jpg'],
      latitude: 20.9892,
      longitude: 107.7695,
      priceRange: 'Miễn phí',
      contactPhone: null,
    },
    {
      name: 'Đỉnh Hải Đăng Cô Tô',
      type: 'ATTRACTION' as const,
      description:
        'Ngọn hải đăng lịch sử trên đỉnh cao nhất đảo, nơi có thể ngắm toàn cảnh đảo Cô Tô và biển cả bao la. Đây cũng là nơi Chủ tịch Hồ Chí Minh đã từng thăm.',
      images: ['/uploads/hai-dang-1.jpg'],
      latitude: 20.9978,
      longitude: 107.7756,
      priceRange: 'Miễn phí',
      contactPhone: null,
    },
    {
      name: 'Bãi Tình Yêu',
      type: 'ATTRACTION' as const,
      description:
        'Bãi biển hoang sơ tuyệt đẹp với tên gọi lãng mạn, phù hợp cho các cặp đôi. Nước biển trong xanh và bãi cát sạch.',
      images: ['/uploads/tinh-yeu-1.jpg', '/uploads/tinh-yeu-2.jpg'],
      latitude: 21.0045,
      longitude: 107.7612,
      priceRange: 'Miễn phí',
      contactPhone: null,
    },
    {
      name: 'Homestay Biển Xanh',
      type: 'HOMESTAY' as const,
      description:
        'Homestay view biển tuyệt đẹp, phòng sạch sẽ, chủ nhà thân thiện. Bao gồm bữa sáng và có thể thuê xe máy tại chỗ.',
      images: ['/uploads/homestay-bien-xanh-1.jpg', '/uploads/homestay-bien-xanh-2.jpg'],
      latitude: 20.9875,
      longitude: 107.7711,
      priceRange: '300.000 - 600.000 VND/đêm',
      contactPhone: '0901111222',
    },
    {
      name: 'Homestay Cô Tô Xanh',
      type: 'HOMESTAY' as const,
      description:
        'Khu homestay hiện đại ngay trung tâm đảo, gần chợ và bến tàu. Có bể bơi mini và dịch vụ đưa đón sân bay.',
      images: ['/uploads/homestay-coto-xanh-1.jpg'],
      latitude: 20.9861,
      longitude: 107.7683,
      priceRange: '400.000 - 800.000 VND/đêm',
      contactPhone: '0902222333',
    },
    {
      name: 'Nhà hàng Hải Sản Tươi Sống',
      type: 'RESTAURANT' as const,
      description:
        'Nhà hàng hải sản tươi ngon trực tiếp từ ngư dân đảo. Đặc sản: Cá mú, tôm hùm, bạch tuộc nướng. Không gian nhìn ra biển.',
      images: ['/uploads/hai-san-1.jpg', '/uploads/hai-san-2.jpg'],
      latitude: 20.9843,
      longitude: 107.7698,
      priceRange: '200.000 - 1.000.000 VND/người',
      contactPhone: '0903333444',
    },
    {
      name: 'Quán Ăn Đảo Xanh',
      type: 'RESTAURANT' as const,
      description:
        'Quán ăn bình dân nhưng ngon miệng. Chuyên phục vụ các món đặc sản đảo: bún cá, cháo hải sản, cơm tấm. Giá cả phải chăng.',
      images: ['/uploads/dao-xanh-1.jpg'],
      latitude: 20.9856,
      longitude: 107.7672,
      priceRange: '50.000 - 150.000 VND/người',
      contactPhone: '0904444555',
    },
    {
      name: 'Cầu Tàu Cô Tô',
      type: 'ATTRACTION' as const,
      description:
        'Cầu tàu chính của đảo, điểm tham quan đẹp vào bình minh và hoàng hôn. Nơi đây là điểm xuất phát của nhiều tour du thuyền quanh đảo.',
      images: ['/uploads/cau-tau-1.jpg'],
      latitude: 20.9820,
      longitude: 107.7701,
      priceRange: 'Miễn phí',
      contactPhone: null,
    },
  ]

  // Check if locations already exist
  const existingCount = await prisma.location.count()
  if (existingCount === 0) {
    for (const loc of locations) {
      await prisma.location.create({
        data: {
          name: loc.name,
          type: loc.type,
          description: loc.description,
          images: loc.images,
          latitude: loc.latitude,
          longitude: loc.longitude,
          priceRange: loc.priceRange,
          contactPhone: loc.contactPhone,
        },
      })
    }
  }

  console.log('✅ Locations seeded')

  // ─── Admin User ──────────────────────────────────────────────
  const bcrypt = await import('bcryptjs')
  const adminHash = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { phone: '0900000000' },
    update: {},
    create: {
      name: 'Admin CoToom',
      phone: '0900000000',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user seeded (phone: 0900000000, password: admin123)')

  console.log('🎉 CoToom database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
