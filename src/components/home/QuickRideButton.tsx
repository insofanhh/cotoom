'use client'

import { useRouter } from 'next/navigation'
import { Car, Bike, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRideStore } from '@/store/rideStore'

const vehicles = [
  { type: 'MOTORBIKE' as const, icon: Bike, label: 'Xe máy', color: 'bg-blue-500' },
  { type: 'CAR' as const, icon: Car, label: 'Ô tô', color: 'bg-indigo-500' },
  { type: 'ELECTRIC_CAR' as const, icon: Zap, label: 'Xe điện', color: 'bg-emerald-500' },
]

interface QuickRideButtonProps {
  pricePerKm?: Record<string, number>
}

function formatRate(value?: number) {
  if (!value) return null
  return value % 1000 === 0 ? `${value / 1000}k` : value.toLocaleString('vi-VN')
}

export function QuickRideButton({ pricePerKm }: QuickRideButtonProps) {
  const router = useRouter()
  const { setSelectedVehicleType } = useRideStore()

  const handleSelect = (type: 'MOTORBIKE' | 'CAR' | 'ELECTRIC_CAR') => {
    setSelectedVehicleType(type)
    router.push('/ride')
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100">
      <p className="text-sm font-semibold text-slate-700 mb-3">Đặt xe ngay</p>
      <div className="grid grid-cols-3 gap-2">
        {vehicles.map((v, i) => {
          const Icon = v.icon
          return (
            <motion.button
              key={v.type}
              id={`quick-ride-${v.type.toLowerCase()}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(v.type)}
              className="flex flex-col items-center gap-2 bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-xl ${v.color} flex items-center justify-center`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-700">{v.label}</p>
                {formatRate(pricePerKm?.[v.type]) && (
                  <p className="text-[10px] text-slate-400">{formatRate(pricePerKm?.[v.type])}/km</p>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
