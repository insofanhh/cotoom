'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Waves, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Metadata } from 'next'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin')
      return
    }
    setLoading(true)
    const result = await signIn('credentials', {
      phone,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      toast.error('Số điện thoại hoặc mật khẩu không đúng')
    } else {
      toast.success('Đăng nhập thành công!')
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl ocean-gradient flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Waves size={28} className="text-white" />
          </div>
          <h1 className="font-outfit font-bold text-2xl text-slate-800">CoToom</h1>
          <p className="text-slate-500 text-sm mt-1">Đặt xe và khám phá Cô Tô</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-outfit font-bold text-lg text-slate-800 mb-5">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-phone" className="text-slate-600 text-sm">
                Số điện thoại
              </Label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="login-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password" className="text-slate-600 text-sm">
                Mật khẩu
              </Label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button
              id="login-submit"
              type="submit"
              className="w-full ocean-gradient text-white font-semibold py-2.5 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>

          {/* Register hint */}
          <p className="text-center text-xs text-slate-400 mt-4">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-blue-500 font-medium hover:text-blue-700">
              Đăng ký
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-300 mt-6">
          Admin demo: 0900000000 / admin123
        </p>
      </div>
    </div>
  )
}
