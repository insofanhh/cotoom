// Full ride lifecycle: client books, driver accepts, drives, completes; client reviews.
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function makeSession() {
  const jar = {}
  return {
    async fetch(path, opts = {}) {
      const res = await fetch(`${BASE}${path}`, {
        ...opts,
        redirect: 'manual',
        headers: {
          ...(opts.headers ?? {}),
          Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '),
        },
      })
      for (const c of res.headers.getSetCookie?.() ?? []) {
        const [pair] = c.split(';')
        const [k, v] = pair.split('=')
        jar[k] = v
      }
      return res
    },
    async login(phone, password) {
      let res = await this.fetch('/api/auth/csrf')
      const { csrfToken } = await res.json()
      res = await this.fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, phone, password }),
      })
      const s = await (await this.fetch('/api/auth/session')).json()
      console.log(`logged in: ${s?.user?.name} (${s?.user?.role})`)
    },
  }
}

const client = makeSession()
const driver = makeSession()

// Ensure the test client account exists (idempotent — 409/400 if already registered)
const reg = await fetch(`${BASE}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Khách Test', phone: '0911222333', password: 'test1234' }),
})
console.log('register client:', reg.status)

await client.login('0911222333', 'test1234')
await driver.login('0944555666', 'driver123')

// 1. Client books a ride (same data the UI produced)
let res = await client.fetch('/api/rides', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pickupLat: 20.9712, pickupLng: 107.76,
    dropoffLat: 20.99361, dropoffLng: 107.77203,
    pickupAddress: 'Thị trấn Cô Tô', dropoffAddress: 'Đỉnh Hải Đăng Cô Tô',
    dropoffName: 'Đỉnh Hải Đăng Cô Tô',
    distanceKm: 3.22, totalPrice: 58000, vehicleType: 'MOTORBIKE',
  }),
})
const ride = await res.json()
console.log('ride created:', ride.id, ride.status, '| watch at /ride/' + ride.id)

await sleep(8000)

// 2. Driver accepts
res = await driver.fetch(`/api/rides/${ride.id}/accept`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ acceptToken: ride.acceptToken }),
})
console.log('accept:', res.status, JSON.stringify(await res.json()))

await sleep(7000)

// 3. Driver starts the trip
res = await driver.fetch(`/api/rides/${ride.id}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'IN_PROGRESS' }),
})
console.log('in_progress:', res.status)

await sleep(7000)

// 4. Driver completes the trip
res = await driver.fetch(`/api/rides/${ride.id}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'COMPLETED' }),
})
console.log('completed:', res.status)

await sleep(2000)

// 5. Client reviews 5 stars
res = await client.fetch(`/api/rides/${ride.id}/review`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rating: 5, comment: 'Tài xế thân thiện, đi an toàn!' }),
})
console.log('review:', res.status, JSON.stringify(await res.json()))
