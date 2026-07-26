// Book a single ride as the test client (no auto-accept) — for driver UI testing
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const jar = {}
async function f(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    redirect: 'manual',
    headers: { ...(opts.headers ?? {}), Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') },
  })
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';')
    const [k, v] = pair.split('=')
    jar[k] = v
  }
  return res
}
let res = await f('/api/auth/csrf')
const { csrfToken } = await res.json()
await f('/api/auth/callback/credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ csrfToken, phone: '0911222333', password: 'test1234' }),
})
res = await f('/api/rides', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pickupLat: 20.9712, pickupLng: 107.76,
    dropoffLat: 20.99361, dropoffLng: 107.77203,
    pickupAddress: 'Thị trấn Cô Tô', dropoffAddress: 'Đỉnh Hải Đăng Cô Tô',
    dropoffName: 'Đỉnh Hải Đăng Cô Tô',
    distanceKm: 5.0, totalPrice: 85000, vehicleType: 'MOTORBIKE',
  }),
})
const ride = await res.json()
console.log('ride:', ride.id, ride.status)
