'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Waves, User, Phone, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirm: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, phone: form.phone, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      // Auto sign in
      await signIn('credentials', { phone: form.phone, password: form.password, redirect: false })
      toast.success('Đăng ký thành công!')
      router.push('/')
    } catch (err: any) {
      toast.error(err.message ?? 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl ocean-gradient flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Waves size={28} className="text-white" />
          </div>
          <h1 className="font-outfit font-bold text-2xl text-slate-800">Tạo tài khoản</h1>
          <p className="text-slate-500 text-sm mt-1">Tham gia CoToom ngay hôm nay</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">Họ và tên</Label>
              <Input id="reg-name" placeholder="Nguyễn Văn A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={loading} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone">Số điện thoại</Label>
              <Input id="reg-phone" type="tel" placeholder="0901234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={loading} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Mật khẩu</Label>
              <Input id="reg-password" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={loading} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-confirm">Xác nhận mật khẩu</Label>
              <Input id="reg-confirm" type="password" placeholder="••••••••" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} disabled={loading} required />
            </div>
            <Button id="reg-submit" type="submit" className="w-full ocean-gradient text-white font-semibold" disabled={loading}>
              {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Đang tạo...</> : 'Đăng ký'}
            </Button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-4">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-blue-500 font-medium hover:text-blue-700">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
