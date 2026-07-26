'use client'

import { signOut } from 'next-auth/react'
import { User, Phone, Shield, LogOut, Settings, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface ProfileUser {
  id: string
  name: string
  phone: string
  role: string
  avatar?: string
}

const roleLabel: Record<string, string> = {
  CLIENT: 'Khách hàng',
  DRIVER: 'Tài xế',
  ADMIN: 'Quản trị viên',
}

const menuItems = [
  { href: '/driver/register', label: 'Đăng ký làm tài xế', icon: Settings, show: (role: string) => role === 'CLIENT' },
  { href: '/driver/dashboard', label: 'Dashboard tài xế', icon: Settings, show: (role: string) => role === 'DRIVER' },
  { href: '/admin', label: 'Quản trị hệ thống', icon: Shield, show: (role: string) => role === 'ADMIN' },
]

export function ProfileClient({ user }: { user: ProfileUser }) {
  return (
    <div className="pb-nav">
      {/* Header */}
      <div className="ocean-gradient px-4 pt-12 pb-16 relative">
        <div className="h-12 bg-white absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 30px 30px 0 0' }} />
        <h1 className="font-outfit font-bold text-white text-xl">Cá nhân</h1>
      </div>

      {/* Avatar card */}
      <div className="px-4 -mt-8 relative z-10 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 text-center"
        >
          <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-blue-100">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="font-outfit font-bold text-slate-800 text-lg">{user.name}</h2>
          <p className="text-slate-500 text-sm flex items-center justify-center gap-1.5 mt-1">
            <Phone size={12} />
            {user.phone}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1 rounded-full">
            <Shield size={11} />
            {roleLabel[user.role] ?? user.role}
          </div>
        </motion.div>
      </div>

      {/* Menu items */}
      <div className="px-4 space-y-2 mb-6">
        {menuItems
          .filter((item) => item.show(user.role))
          .map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`profile-menu-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon size={16} className="text-blue-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700">{item.label}</span>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
            )
          })}
      </div>

      {/* Logout */}
      <div className="px-4">
        <Button
          id="profile-logout"
          variant="outline"
          className="w-full border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 font-semibold gap-2"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut size={16} />
          Đăng xuất
        </Button>
      </div>
    </div>
  )
}
