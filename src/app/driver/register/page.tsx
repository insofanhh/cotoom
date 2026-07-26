'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Waves, User, Phone, Lock, Car, Bike, Zap, Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

const vehicles = [
  { type: 'MOTORBIKE', label: 'Xe máy', icon: Bike, description: 'Phù hợp các tuyến ngắn' },
  { type: 'CAR', label: 'Ô tô', icon: Car, description: 'Thoải mái 4+ khách' },
  { type: 'ELECTRIC_CAR', label: 'Xe điện', icon: Zap, description: 'Thân thiện môi trường' },
]

export default function DriverRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    vehicleType: 'MOTORBIKE',
    vehiclePlate: '',
  })

  // Fetch session to prefill info
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(session => {
        if (session?.user) {
          setIsLoggedIn(true)
          setForm(prev => ({
            ...prev,
            name: session.user.name || '',
            phone: session.user.phone || '',
          }))
        }
        setLoadingSession(false)
      })
      .catch(() => setLoadingSession(false))
  }, [])

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.vehiclePlate || (!isLoggedIn && !form.password)) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/driver/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Có lỗi xảy ra')
      setSuccess(true)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="font-outfit font-bold text-xl text-slate-800 mb-2">Đã gửi hồ sơ!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Hồ sơ của bạn đang được xem xét. Chúng tôi sẽ liên hệ trong vòng 24 giờ.
          </p>
          <Button
            id="register-go-home"
            className="ocean-gradient text-white font-semibold"
            onClick={() => router.push('/')}
          >
            Về trang chủ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-slate-50">
      {/* Header */}
      <div className="ocean-gradient px-4 pt-12 pb-8 relative">
        <div className="h-6 bg-slate-50 absolute bottom-0 left-0 right-0" style={{ borderRadius: '60% 60% 0 0 / 20px 20px 0 0' }} />
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="text-white/70 hover:text-white">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="font-outfit font-bold text-white text-xl">Đăng ký Tài xế</h1>
            <p className="text-blue-100 text-xs">Tham gia đội ngũ CoToom</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                s === step ? 'bg-white text-blue-700' :
                s < step ? 'bg-white/30 text-white' : 'bg-white/20 text-white/50'
              )}>
                {s < step ? '✓' : s}
              </div>
              {s < 2 && <div className={cn('w-8 h-0.5 rounded', s < step ? 'bg-white/60' : 'bg-white/20')} />}
            </div>
          ))}
          <span className="text-white/70 text-xs ml-2">Bước {step}/2</span>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 pt-6 pb-10 max-w-sm mx-auto">
        {step === 1 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
            <h2 className="font-semibold text-slate-800">Thông tin cá nhân</h2>
            <div className="space-y-4 mb-8">
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên</Label>
                <Input
                  id="name"
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0901234567"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={isLoggedIn}
                />
              </div>
              {!isLoggedIn && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu đăng nhập</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                  />
                </div>
              )}
            </div>
            <Button id="driver-step1-next" className="w-full ocean-gradient text-white font-semibold" onClick={() => {
              if (!form.name || !form.phone || (!isLoggedIn && !form.password)) { toast.error('Vui lòng điền đầy đủ'); return }
              setStep(2)
            }}>
              Tiếp theo →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
              <h2 className="font-semibold text-slate-800">Thông tin xe</h2>

              <div className="space-y-2">
                <Label>Loại xe</Label>
                <div className="space-y-2">
                  {vehicles.map((v) => {
                    const Icon = v.icon
                    return (
                      <button
                        key={v.type}
                        id={`vehicle-${v.type.toLowerCase()}`}
                        onClick={() => handleChange('vehicleType', v.type)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left',
                          form.vehicleType === v.type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-100 bg-white hover:border-blue-200'
                        )}
                      >
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', form.vehicleType === v.type ? 'bg-blue-500' : 'bg-slate-100')}>
                          <Icon size={18} className={form.vehicleType === v.type ? 'text-white' : 'text-slate-500'} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{v.label}</p>
                          <p className="text-slate-400 text-xs">{v.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vehicle-plate">Biển số xe</Label>
                <Input id="vehicle-plate" placeholder="30A-12345" value={form.vehiclePlate} onChange={(e) => handleChange('vehiclePlate', e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button id="driver-step2-back" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                ← Quay lại
              </Button>
              <Button id="driver-submit" className="flex-1 ocean-gradient text-white font-semibold" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                {loading ? 'Đang gửi...' : 'Đăng ký'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
