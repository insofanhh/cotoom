'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  MapPin,
  Settings,
  LogOut,
  Waves,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

const adminNav = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/drivers', label: 'Tài xế', icon: Users },
  { href: '/admin/places', label: 'Địa điểm', icon: MapPin },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
]

interface AdminShellProps {
  children: React.ReactNode
  title?: string
}

export function AdminShell({ children, title }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-svh flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-100 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl ocean-gradient flex items-center justify-center">
            <Waves size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 font-outfit text-lg leading-none">CoToom</p>
            <p className="text-xs text-slate-400 mt-0.5">Admin Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1" aria-label="Admin navigation">
          {adminNav.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`admin-nav-${item.label}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )}
              >
                <Icon size={18} />
                {item.label}
                {isActive && (
                  <ChevronRight size={14} className="ml-auto text-blue-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => signOut({ callbackUrl: '/login' })}
            id="admin-logout"
          >
            <LogOut size={18} />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {title && (
          <header className="bg-white border-b border-slate-100 px-8 py-5">
            <h1 className="text-xl font-bold text-slate-800 font-outfit">{title}</h1>
          </header>
        )}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  )
}
