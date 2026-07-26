'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/discovery', label: 'Khám phá', icon: Compass },
  { href: '/history', label: 'Lịch sử', icon: Clock },
  { href: '/profile', label: 'Cá nhân', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 relative"
            >
              <div className="relative flex items-center justify-center">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 -m-2 rounded-xl bg-blue-50"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={22}
                  className={cn(
                    'relative z-10 transition-colors duration-200',
                    isActive
                      ? 'text-blue-600'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors duration-200',
                  isActive ? 'text-blue-600' : 'text-slate-400'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
