import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminShell } from '@/components/layout/AdminShell'
import { Car, Users, MapPin, TrendingUp, Clock } from 'lucide-react'
import { formatVND } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Dashboard' }

async function getDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalRidesToday, totalRevenue, activeDrivers, pendingDrivers, totalLocations] =
    await Promise.all([
      prisma.ride.count({ where: { createdAt: { gte: today } } }),
      prisma.ride.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { totalPrice: true },
      }),
      prisma.driverProfile.count({ where: { isOnline: true, status: 'APPROVED' } }),
      prisma.driverProfile.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.location.count(),
    ])

  return { totalRidesToday, totalRevenue: totalRevenue._sum.totalPrice ?? 0, activeDrivers, pendingDrivers, totalLocations }
}

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  const stats = await getDashboardStats()

  const kpis = [
    { label: 'Chuyến đi hôm nay', value: stats.totalRidesToday.toString(), icon: Car, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Doanh thu hôm nay', value: formatVND(stats.totalRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Tài xế online', value: stats.activeDrivers.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Chờ phê duyệt', value: stats.pendingDrivers.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', alert: stats.pendingDrivers > 0 },
    { label: 'Địa điểm', value: stats.totalLocations.toString(), icon: MapPin, color: 'text-rose-600', bg: 'bg-rose-50' },
  ]

  return (
    <AdminShell title="Tổng quan">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className={`bg-white rounded-2xl p-5 border shadow-sm ${kpi.alert ? 'border-amber-300' : 'border-slate-100'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${kpi.bg}`}>
                <Icon size={20} className={kpi.color} />
              </div>
              <p className="font-outfit font-bold text-2xl text-slate-800">{kpi.value}</p>
              <p className="text-slate-500 text-xs mt-1">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent rides */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Chuyến đi gần đây</h2>
        </div>
        <RecentRides />
      </div>
    </AdminShell>
  )
}

async function RecentRides() {
  const rides = await prisma.ride.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { name: true, phone: true } },
      driver: { select: { name: true } },
    },
  })

  if (rides.length === 0) {
    return <div className="px-6 py-8 text-center text-slate-400 text-sm">Chưa có chuyến đi nào</div>
  }

  const statusColors: Record<string, string> = {
    SEARCHING: 'bg-amber-100 text-amber-700',
    ACCEPTED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs">Khách hàng</th>
            <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs">Tài xế</th>
            <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs">Khoảng cách</th>
            <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs">Giá</th>
            <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rides.map((ride) => (
            <tr key={ride.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3">
                <p className="font-medium text-slate-800">{ride.client.name}</p>
                <p className="text-slate-400 text-xs">{ride.client.phone}</p>
              </td>
              <td className="px-6 py-3 text-slate-600">{ride.driver?.name ?? '—'}</td>
              <td className="px-6 py-3 text-slate-600">{ride.distanceKm.toFixed(1)} km</td>
              <td className="px-6 py-3 font-semibold text-blue-600">{formatVND(ride.totalPrice)}</td>
              <td className="px-6 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ride.status]}`}>
                  {ride.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
