'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'

export function HeroSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/discovery?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="ocean-gradient px-5 pt-14 pb-10 relative overflow-hidden">
      {/* Decorative waves */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-white" style={{ borderRadius: '60% 60% 0 0 / 30px 30px 0 0' }} />
      <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute top-12 left-8 w-20 h-20 rounded-full bg-cyan-300/20 blur-xl" />

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} className="text-cyan-200" />
          <span className="text-cyan-100 text-xs font-medium">Đảo Cô Tô, Quảng Ninh</span>
        </div>
        <h1 className="text-white font-outfit font-bold text-2xl leading-tight mb-1">
          Chào mừng đến <br />
          <span className="text-cyan-200">Cô Tô! 🌊</span>
        </h1>
        <p className="text-blue-100 text-sm">Khám phá, ăn uống, di chuyển — tất cả trong một</p>
      </motion.div>

      {/* Search bar */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        onSubmit={handleSearch}
        className="mt-5 relative"
      >
        <div className="relative">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="hero-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm địa điểm, homestay, nhà hàng..."
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white text-slate-800 text-sm shadow-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 font-medium"
          />
        </div>
      </motion.form>
    </div>
  )
}
